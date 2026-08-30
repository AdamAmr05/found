import {
  createThread,
  listUIMessages,
  saveMessage,
  syncStreams,
  vStreamArgs,
} from '@convex-dev/agent'
import { paginationOptsValidator } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import { SessionIdArg } from 'convex-helpers/server/sessions'
import type { SessionId } from 'convex-helpers/server/sessions'

import { components, internal } from './_generated/api'
import {
  type MutationCtx,
  internalAction,
  mutation,
  query,
} from './_generated/server'
import { foundAgent } from './agent'
import { HOUR, RateLimiter } from '@convex-dev/rate-limiter'

import { buildFoundRunInstructions } from './agentInstructions'
import { assertThreadOwner, hasThreadAccess } from './threadAccess'
import { truncateText } from '../shared/text'
import { candidateToolCalls } from './candidatePartMessages'

const MAX_PROMPT_LENGTH = 8_000

type OutreachRunContext = {
  readonly changedDrafts: readonly {
    readonly outreachId: string
    readonly candidateTitle: string
    readonly recipient: string
    readonly subject: string
    readonly body: string
    readonly revision: number
  }[]
  readonly unreadReplies: readonly {
    readonly outreachId: string
    readonly candidateTitle: string
  }[]
}

function outreachRunContext(context: OutreachRunContext): string {
  if (
    context.changedDrafts.length === 0 &&
    context.unreadReplies.length === 0
  ) {
    return ''
  }
  return `\n\nTURN-SPECIFIC OUTREACH CONTEXT
This is private context, not a user message. Do not mention it unless relevant.
If a reply notice matters, call readOutreachThread for that outreachId before answering.
${JSON.stringify(context)}`
}

// Each run fans out into billed research and Maps calls, so message sends are
// budgeted per session rather than left open on the public mutation.
const rateLimiter = new RateLimiter(components.rateLimiter, {
  sendMessage: { kind: 'token bucket', rate: 30, period: HOUR, capacity: 8 },
})

function normalizePrompt(prompt: string): string {
  const normalized = prompt.trim()
  if (normalized.length === 0) {
    throw new ConvexError({ code: 'EMPTY_PROMPT' })
  }
  if (normalized.length > MAX_PROMPT_LENGTH) {
    throw new ConvexError({
      code: 'PROMPT_TOO_LONG',
      maxLength: MAX_PROMPT_LENGTH,
    })
  }
  return normalized
}

function titleFromPrompt(prompt: string): string {
  const firstLine = prompt.split('\n', 1)[0] ?? prompt
  return firstLine.length <= 72
    ? firstLine
    : `${truncateText(firstLine, 69)}...`
}

async function saveAndScheduleResponse(
  ctx: MutationCtx,
  args: { threadId: string; sessionId: SessionId; prompt: string },
): Promise<void> {
  const { messageId } = await saveMessage(ctx, components.agent, {
    threadId: args.threadId,
    userId: args.sessionId,
    prompt: args.prompt,
  })

  await ctx.scheduler.runAfter(0, internal.thread.respond, {
    threadId: args.threadId,
    sessionId: args.sessionId,
    promptMessageId: messageId,
  })
}

export const start = mutation({
  args: {
    ...SessionIdArg,
    prompt: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, 'sendMessage', {
      key: args.sessionId,
      throws: true,
    })
    const prompt = normalizePrompt(args.prompt)
    const threadId = await createThread(ctx, components.agent, {
      userId: args.sessionId,
      title: titleFromPrompt(prompt),
    })

    await saveAndScheduleResponse(ctx, {
      threadId,
      sessionId: args.sessionId,
      prompt,
    })
    return threadId
  },
})

export const send = mutation({
  args: {
    ...SessionIdArg,
    threadId: v.string(),
    prompt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    await rateLimiter.limit(ctx, 'sendMessage', {
      key: args.sessionId,
      throws: true,
    })
    await saveAndScheduleResponse(ctx, {
      threadId: args.threadId,
      sessionId: args.sessionId,
      prompt: normalizePrompt(args.prompt),
    })
    return null
  },
})

export const listMessages = query({
  args: {
    ...SessionIdArg,
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  // The Agent component owns this UI-message union and does not export a
  // complete Convex validator for listUIMessages plus live stream deltas.
  returns: v.any(),
  handler: async (ctx, args) => {
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    const [page, streams] = await Promise.all([
      listUIMessages(ctx, components.agent, {
        threadId: args.threadId,
        paginationOpts: {
          ...args.paginationOpts,
          numItems: Math.min(args.paginationOpts.numItems, 100),
        },
      }),
      syncStreams(ctx, components.agent, args),
    ])
    return { ...page, streams }
  },
})

export const canResume = query({
  args: { ...SessionIdArg, threadId: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) =>
    hasThreadAccess(ctx, args.threadId, args.sessionId),
})

export const respond = internalAction({
  args: {
    ...SessionIdArg,
    threadId: v.string(),
    promptMessageId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    const outreachContext = await ctx.runQuery(
      internal.outreachMailbox.contextForRun,
      {
        threadId: args.threadId,
        sessionId: args.sessionId,
      },
    )
    const result = await foundAgent.streamText(
      ctx,
      { threadId: args.threadId, userId: args.sessionId },
      {
        promptMessageId: args.promptMessageId,
        instructions: `${buildFoundRunInstructions({
          researchToolsAvailable: true,
          todayIsoDate: new Date().toISOString().slice(0, 10),
        })}${outreachRunContext(outreachContext)}`,
      },
      { saveStreamDeltas: { throttleMs: 500 } },
    )
    const parts = candidateToolCalls(result.savedMessages ?? [])
    if (parts.length > 0) {
      // KNOWN LIMITATION: Agent messages are durable before this app-owned
      // provenance index. If this write fails, the rendered candidates remain
      // unavailable to save until an idempotent reconciliation path is added.
      await ctx.runMutation(internal.candidateParts.recordBatch, {
        parts,
        sessionId: args.sessionId,
        threadId: args.threadId,
      })
    }
    if (outreachContext.changedDrafts.length > 0) {
      await ctx.runMutation(internal.outreachMailbox.markAgentSeen, {
        threadId: args.threadId,
        sessionId: args.sessionId,
        revisions: outreachContext.changedDrafts.map((draft) => ({
          outreachId: draft.outreachId,
          revision: draft.revision,
        })),
      })
    }
    return null
  },
})
