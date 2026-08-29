import {
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server'
import { ConvexError, v } from 'convex/values'
import { SessionIdArg } from 'convex-helpers/server/sessions'

import {
  CANDIDATE_PRESENTATION_MAX_COUNT,
  CANDIDATE_REF_MAX_LENGTH,
} from '../shared/foundTools'
import type { CandidateSnapshot } from '../shared/foundTools'
import { components } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { mutation, query } from './_generated/server'
import type { QueryCtx } from './_generated/server'
import { candidateFromToolMessage } from './candidatePartMessages'
import { assertCandidatePartReference } from './candidateParts'
import { assertThreadOwner } from './threadAccess'

const MAX_TOOL_CALL_ID_LENGTH = 256

const savedPrice = v.object({
  amount: v.number(),
  basis: v.union(v.literal('all_in'), v.literal('base')),
  confidence: v.union(
    v.literal('stated'),
    v.literal('derived'),
    v.literal('estimated'),
  ),
  currency: v.string(),
  period: v.union(
    v.literal('night'),
    v.literal('week'),
    v.literal('month'),
    v.literal('stay'),
  ),
})

const savedCandidateView = v.object({
  candidateRef: v.string(),
  imageUrl: v.optional(v.string()),
  locationLabel: v.string(),
  price: v.optional(savedPrice),
  savedAt: v.number(),
  source: v.object({ label: v.string(), url: v.string() }),
  summary: v.string(),
  threadId: v.string(),
  title: v.string(),
  toolCallId: v.string(),
})

type SavedCandidateEntry = Doc<'savedCandidates'>

function assertToolCallId(toolCallId: string): void {
  if (toolCallId.length === 0 || toolCallId.length > MAX_TOOL_CALL_ID_LENGTH) {
    throw new ConvexError({ code: 'INVALID_SAVED_CANDIDATE_REFERENCE' })
  }
}

function assertCandidateRef(candidateRef: string): void {
  if (
    candidateRef.length === 0 ||
    candidateRef.length > CANDIDATE_REF_MAX_LENGTH
  ) {
    throw new ConvexError({ code: 'INVALID_SAVED_CANDIDATE_REFERENCE' })
  }
}

function presentSavedCandidate(
  entry: SavedCandidateEntry,
  candidate: CandidateSnapshot,
) {
  const source = candidate.sources[0]
  if (!source) {
    throw new ConvexError({ code: 'SAVED_CANDIDATE_CONTENT_NOT_FOUND' })
  }
  const presented = {
    candidateRef: entry.candidateRef,
    locationLabel: candidate.location.label,
    savedAt: entry._creationTime,
    source: {
      label: source.label,
      url: source.url,
    },
    summary: candidate.atAGlance.summary,
    threadId: entry.threadId,
    title: candidate.title,
    toolCallId: entry.toolCallId,
  }
  const withImage = entry.imageUrl
    ? { ...presented, imageUrl: entry.imageUrl }
    : presented
  return candidate.price ? { ...withImage, price: candidate.price } : withImage
}

async function resolveSavedCandidates(
  ctx: QueryCtx,
  entries: readonly SavedCandidateEntry[],
) {
  const messages = await ctx.runQuery(
    components.agent.messages.getMessagesByIds,
    { messageIds: entries.map((entry) => entry.messageId) },
  )

  return entries.map((entry, index) => {
    const message = messages[index]
    const candidate =
      message &&
      candidateFromToolMessage(message, entry.toolCallId, entry.candidateRef)
    if (!candidate) {
      throw new ConvexError({ code: 'SAVED_CANDIDATE_CONTENT_NOT_FOUND' })
    }
    return presentSavedCandidate(entry, candidate)
  })
}

export const listBookmarks = query({
  args: { ...SessionIdArg, paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(savedCandidateView),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query('savedCandidates')
      .withIndex('by_session', (index) => index.eq('sessionId', args.sessionId))
      .order('desc')
      .paginate(args.paginationOpts)

    return { ...result, page: await resolveSavedCandidates(ctx, result.page) }
  },
})

export const listForThread = query({
  args: {
    ...SessionIdArg,
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(savedCandidateView),
  handler: async (ctx, args) => {
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    const result = await ctx.db
      .query('savedCandidates')
      .withIndex('by_session_and_thread', (index) =>
        index.eq('sessionId', args.sessionId).eq('threadId', args.threadId),
      )
      .order('desc')
      .paginate(args.paginationOpts)

    return { ...result, page: await resolveSavedCandidates(ctx, result.page) }
  },
})

export const listForToolPart = query({
  args: {
    ...SessionIdArg,
    threadId: v.string(),
    toolCallId: v.string(),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    assertToolCallId(args.toolCallId)
    const entries = await ctx.db
      .query('savedCandidates')
      .withIndex('by_session_and_thread_and_tool_and_candidate', (index) =>
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
    const part = args.saved
      ? await assertCandidatePartReference(ctx, args)
      : undefined
    const existing = await ctx.db
      .query('savedCandidates')
      .withIndex('by_session_and_thread_and_tool_and_candidate', (index) =>
        index
          .eq('sessionId', args.sessionId)
          .eq('threadId', args.threadId)
          .eq('toolCallId', args.toolCallId)
          .eq('candidateRef', args.candidateRef),
      )
      .unique()

    if (args.saved && !existing && part) {
      const savedCandidate = {
        sessionId: args.sessionId,
        threadId: args.threadId,
        messageId: part.messageId,
        toolCallId: args.toolCallId,
        candidateRef: args.candidateRef,
      }
      await ctx.db.insert(
        'savedCandidates',
        part.imageUrl
          ? { ...savedCandidate, imageUrl: part.imageUrl }
          : savedCandidate,
      )
    } else if (!args.saved && existing) {
      await ctx.db.delete('savedCandidates', existing._id)
    }

    return args.saved
  },
})
