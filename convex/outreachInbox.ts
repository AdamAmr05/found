import { makeFunctionReference } from 'convex/server'
import { v } from 'convex/values'
import { SessionIdArg } from 'convex-helpers/server/sessions'
import type { SessionId } from 'convex-helpers/server/sessions'

import type { Id } from './_generated/dataModel'
import { action, mutation, query } from './_generated/server'
import { ownedDraft } from './outreachDrafts'
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

const readMailThread = makeFunctionReference<
  'action',
  {
    sessionId: SessionId
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
  args: SessionIdArg,
  returns: v.array(vInboxItem),
  handler: async (ctx, args) => {
    const drafts = await ctx.db
      .query('outreachDrafts')
      .withIndex('by_session_and_latest_activity', (index) =>
        index.eq('sessionId', args.sessionId),
      )
      .order('desc')
      .take(100)
    return drafts.map((draft) => ({
      outreachId: draft._id,
      threadId: draft.threadId,
      candidateTitle: draft.candidateTitle,
      recipient: draft.recipient,
      subject: draft.subject,
      state: draft.state,
      unreadReplyCount: humanUnreadReplyCount(draft),
      latestActivityAt: draft.latestActivityAt,
      canReadThread: Boolean(draft.agentmailThreadId),
    }))
  },
})

export const read = action({
  args: {
    ...SessionIdArg,
    threadId: v.string(),
    outreachId: v.id('outreachDrafts'),
  },
  returns: vOutreachMailThread,
  handler: async (ctx, args) =>
    await ctx.runAction(readMailThread, {
      sessionId: args.sessionId,
      foundThreadId: args.threadId,
      outreachId: args.outreachId,
    }),
})

export const markRead = mutation({
  args: {
    ...SessionIdArg,
    outreachId: v.id('outreachDrafts'),
    observedReplyRevision: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.outreachId, args.sessionId)
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
