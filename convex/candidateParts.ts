import { ConvexError, v } from 'convex/values'
import { vSessionId } from 'convex-helpers/server/sessions'
import type { SessionId } from 'convex-helpers/server/sessions'

import {
  CANDIDATE_REF_MAX_LENGTH,
  CANDIDATE_PRESENTATION_MAX_COUNT,
} from '../shared/foundTools'
import { internalMutation } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import { assertThreadOwner } from './threadAccess'

function assertCandidateRefs(candidateRefs: readonly string[]): void {
  if (
    candidateRefs.length === 0 ||
    candidateRefs.length > CANDIDATE_PRESENTATION_MAX_COUNT ||
    new Set(candidateRefs).size !== candidateRefs.length ||
    candidateRefs.some(
      (candidateRef) =>
        candidateRef.length === 0 ||
        candidateRef.length > CANDIDATE_REF_MAX_LENGTH,
    )
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
  const part = await ctx.db
    .query('candidatePartRefs')
    .withIndex('by_session_thread_tool', (index) =>
      index
        .eq('sessionId', args.sessionId)
        .eq('threadId', args.threadId)
        .eq('toolCallId', args.toolCallId),
    )
    .unique()

  if (!part?.candidateRefs.includes(args.candidateRef)) {
    throw new ConvexError({ code: 'CANDIDATE_PART_NOT_FOUND' })
  }
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
