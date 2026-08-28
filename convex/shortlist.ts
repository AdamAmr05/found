import { ConvexError, v } from 'convex/values'
import { SessionIdArg } from 'convex-helpers/server/sessions'

import { CANDIDATE_PRESENTATION_MAX_COUNT } from '../shared/foundTools'
import { mutation, query } from './_generated/server'
import { assertCandidatePartReference } from './candidateParts'
import { assertThreadOwner } from './threadAccess'

const MAX_CANDIDATE_REF_LENGTH = 48
const MAX_TOOL_CALL_ID_LENGTH = 256

function assertToolCallId(toolCallId: string): void {
  if (toolCallId.length === 0 || toolCallId.length > MAX_TOOL_CALL_ID_LENGTH) {
    throw new ConvexError({ code: 'INVALID_SHORTLIST_REFERENCE' })
  }
}

function assertCandidateRef(candidateRef: string): void {
  if (
    candidateRef.length === 0 ||
    candidateRef.length > MAX_CANDIDATE_REF_LENGTH
  ) {
    throw new ConvexError({ code: 'INVALID_SHORTLIST_REFERENCE' })
  }
}

export const listForToolPart = query({
  args: {
    ...SessionIdArg,
    threadId: v.string(),
    toolCallId: v.string(),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    assertToolCallId(args.toolCallId)
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    const entries = await ctx.db
      .query('shortlistEntries')
      .withIndex('by_session_thread_tool_candidate', (index) =>
        index
          .eq('sessionId', args.sessionId)
          .eq('threadId', args.threadId)
          .eq('toolCallId', args.toolCallId),
      )
      .take(CANDIDATE_PRESENTATION_MAX_COUNT)

    return entries.map((entry) => entry.candidateRef)
  },
})

export const setSaved = mutation({
  args: {
    ...SessionIdArg,
    threadId: v.string(),
    toolCallId: v.string(),
    candidateRef: v.string(),
    saved: v.boolean(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    assertToolCallId(args.toolCallId)
    assertCandidateRef(args.candidateRef)
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    if (args.saved) {
      await assertCandidatePartReference(ctx, args)
    }
    const existing = await ctx.db
      .query('shortlistEntries')
      .withIndex('by_session_thread_tool_candidate', (index) =>
        index
          .eq('sessionId', args.sessionId)
          .eq('threadId', args.threadId)
          .eq('toolCallId', args.toolCallId)
          .eq('candidateRef', args.candidateRef),
      )
      .unique()

    if (args.saved && !existing) {
      await ctx.db.insert('shortlistEntries', {
        sessionId: args.sessionId,
        threadId: args.threadId,
        toolCallId: args.toolCallId,
        candidateRef: args.candidateRef,
      })
    } else if (!args.saved && existing) {
      await ctx.db.delete('shortlistEntries', existing._id)
    }

    return args.saved
  },
})
