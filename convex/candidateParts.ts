import { listMessages, toUIMessages } from '@convex-dev/agent'
import { ConvexError, v } from 'convex/values'
import { vSessionId } from 'convex-helpers/server/sessions'
import type { SessionId } from 'convex-helpers/server/sessions'

import {
  historicalCandidatesInputSchema,
  type FoundUITools,
} from '../shared/foundTools'
import { components } from './_generated/api'
import { internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import { assertThreadOwner } from './threadAccess'

const MAX_CANDIDATES_PER_PART = 12

function assertCandidateRefs(candidateRefs: readonly string[]): void {
  if (
    candidateRefs.length === 0 ||
    candidateRefs.length > MAX_CANDIDATES_PER_PART ||
    new Set(candidateRefs).size !== candidateRefs.length
  ) {
    throw new ConvexError({ code: 'INVALID_CANDIDATE_PART' })
  }
}

export async function assertCandidatePartReference(
  ctx: MutationCtx,
  args: {
    readonly sessionId: SessionId
    readonly threadId: string
    readonly toolCallId: string
    readonly candidateRef: string
  },
): Promise<void> {
  let part = await ctx.db
    .query('candidatePartRefs')
    .withIndex('by_session_thread_tool', (index) =>
      index
        .eq('sessionId', args.sessionId)
        .eq('threadId', args.threadId)
        .eq('toolCallId', args.toolCallId),
    )
    .unique()

  if (!part) {
    const candidateRefs = await findHistoricalCandidateRefs(ctx, args)
    if (candidateRefs) {
      const partId = await ctx.db.insert('candidatePartRefs', {
        sessionId: args.sessionId,
        threadId: args.threadId,
        toolCallId: args.toolCallId,
        candidateRefs,
      })
      part = await ctx.db.get('candidatePartRefs', partId)
    }
  }

  if (!part?.candidateRefs.includes(args.candidateRef)) {
    throw new ConvexError({ code: 'CANDIDATE_PART_NOT_FOUND' })
  }
}

async function findHistoricalCandidateRefs(
  ctx: MutationCtx,
  args: { readonly threadId: string; readonly toolCallId: string },
): Promise<string[] | undefined> {
  const { page } = await listMessages(ctx, components.agent, {
    threadId: args.threadId,
    paginationOpts: { cursor: null, numItems: 100 },
  })
  const messages = toUIMessages<Record<string, never>, never, FoundUITools>(
    page,
  )

  for (const message of messages) {
    for (const part of message.parts) {
      if (
        part.type !== 'tool-showCandidates' ||
        part.toolCallId !== args.toolCallId ||
        part.state !== 'output-available'
      ) {
        continue
      }
      const parsed = historicalCandidatesInputSchema.safeParse(part.output)
      if (parsed.success) {
        return parsed.data.candidates.map((candidate) => candidate.ref)
      }
    }
  }

  return undefined
}

export const record = internalMutation({
  args: {
    sessionId: vSessionId,
    threadId: v.string(),
    toolCallId: v.string(),
    candidateRefs: v.array(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    assertCandidateRefs(args.candidateRefs)
    await assertThreadOwner(ctx, args.threadId, args.sessionId)

    const existing = await ctx.db
      .query('candidatePartRefs')
      .withIndex('by_session_thread_tool', (index) =>
        index
          .eq('sessionId', args.sessionId)
          .eq('threadId', args.threadId)
          .eq('toolCallId', args.toolCallId),
      )
      .unique()

    if (existing) {
      const unchanged =
        existing.candidateRefs.length === args.candidateRefs.length &&
        existing.candidateRefs.every(
          (candidateRef, index) => candidateRef === args.candidateRefs[index],
        )
      if (!unchanged) {
        throw new ConvexError({ code: 'CANDIDATE_PART_CONFLICT' })
      }
      return null
    }

    await ctx.db.insert('candidatePartRefs', args)
    return null
  },
})
