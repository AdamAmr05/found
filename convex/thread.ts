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
import { buildFoundRunInstructions } from './agentInstructions'
import { assertThreadOwner, hasThreadAccess } from './threadAccess'
import { truncateText } from '../shared/text'
import { candidateToolCalls } from './candidatePartMessages'

const MAX_PROMPT_LENGTH = 8_000

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
    const result = await foundAgent.streamText(
      ctx,
      { threadId: args.threadId, userId: args.sessionId },
      {
        promptMessageId: args.promptMessageId,
        instructions: buildFoundRunInstructions({
          researchToolsAvailable: true,
        }),
      },
      { saveStreamDeltas: { throttleMs: 500 } },
    )
    const parts = candidateToolCalls(result.savedMessages ?? [])
    if (parts.length > 0) {
      await ctx.runMutation(internal.candidateParts.recordBatch, {
        parts,
        sessionId: args.sessionId,
        threadId: args.threadId,
      })
    }
    return null
  },
})
