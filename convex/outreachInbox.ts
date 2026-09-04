import {
  makeFunctionReference,
  paginationOptsValidator,
  paginationResultValidator,
} from 'convex/server'
import { v } from 'convex/values'

import type { Id } from './_generated/dataModel'
import { action, mutation, query } from './_generated/server'
import { viewerDraft } from './outreachDrafts'
import {
  type OutreachMailThread,
  vOutreachMailThread,
  vOutreachState,
} from './outreachModel'
import {
  humanReadThroughReplyRevision,
  humanUnreadReplyCount,
  observedReplyRevision,
  replyRevision,
} from './outreachReplyState'
import { requireViewerId } from './viewer'

const readMailThread = makeFunctionReference<
  'action',
  {
    userId: Id<'users'>
    foundThreadId: string
    outreachId: Id<'outreachDrafts'>
  },
  OutreachMailThread
>('outreachMailbox:readThread')

const vInboxItem = v.object({
  outreachId: v.id('outreachDrafts'),
  threadId: v.string(),
  candidateTitle: v.string(),
  recipient: v.string(),
  subject: v.string(),
  state: vOutreachState,
  unreadReplyCount: v.number(),
  latestActivityAt: v.number(),
  canReadThread: v.boolean(),
})

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(vInboxItem),
  handler: async (ctx, args) => {
    const userId = await requireViewerId(ctx)
    const drafts = await ctx.db
      .query('outreachDrafts')
      .withIndex('by_user_and_latest_activity', (index) =>
        index.eq('userId', userId),
      )
      .order('desc')
      .paginate(args.paginationOpts)
    return {
      ...drafts,
      page: drafts.page.map((draft) => ({
        outreachId: draft._id,
        threadId: draft.threadId,
        candidateTitle: draft.candidateTitle,
        recipient: draft.recipient,
        subject: draft.subject,
        state: draft.state,
        unreadReplyCount: humanUnreadReplyCount(draft),
        latestActivityAt: draft.latestActivityAt,
        canReadThread: Boolean(draft.agentmailThreadId),
      })),
    }
  },
})

export const read = action({
  args: {
    threadId: v.string(),
    outreachId: v.id('outreachDrafts'),
  },
  returns: vOutreachMailThread,
  handler: async (ctx, args) =>
    await ctx.runAction(readMailThread, {
      userId: await requireViewerId(ctx),
      foundThreadId: args.threadId,
      outreachId: args.outreachId,
    }),
})

export const markRead = mutation({
  args: {
    outreachId: v.id('outreachDrafts'),
    observedReplyRevision: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await viewerDraft(ctx, args.outreachId)
    const currentRevision = replyRevision(draft)
    const currentReadThrough = humanReadThroughReplyRevision(draft)
    const observedRevision = observedReplyRevision(
      args.observedReplyRevision,
      currentRevision,
    )
    const nextReadThrough = Math.max(currentReadThrough, observedRevision)
    if (nextReadThrough !== draft.humanReadThroughReplyRevision) {
      await ctx.db.patch('outreachDrafts', draft._id, {
        humanReadThroughReplyRevision: nextReadThrough,
      })
    }
    return null
  },
})
