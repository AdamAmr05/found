import { makeFunctionReference } from 'convex/server'
import { v } from 'convex/values'
import { SessionIdArg } from 'convex-helpers/server/sessions'
import type { SessionId } from 'convex-helpers/server/sessions'

import type { Id } from './_generated/dataModel'
import { action, mutation, query } from './_generated/server'
import { ownedDraft } from './outreachDrafts'

type MailThread = {
  outreachId: string
  candidateTitle: string
  subject: string
  messages: {
    messageId: string
    direction: 'outbound' | 'inbound'
    from: string
    to: string[]
    timestamp: string
    body: string
  }[]
}

const readMailThread = makeFunctionReference<
  'action',
  {
    sessionId: SessionId
    foundThreadId: string
    outreachId: Id<'outreachDrafts'>
  },
  MailThread
>('outreachMailbox:readThread')

const vInboxItem = v.object({
  outreachId: v.id('outreachDrafts'),
  threadId: v.string(),
  candidateTitle: v.string(),
  recipient: v.string(),
  subject: v.string(),
  state: v.union(
    v.literal('draft'),
    v.literal('approved'),
    v.literal('queued'),
    v.literal('sent'),
    v.literal('replied'),
    v.literal('failed'),
  ),
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
      unreadReplyCount: draft.unreadReplyCount,
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
  returns: v.object({
    outreachId: v.string(),
    candidateTitle: v.string(),
    subject: v.string(),
    messages: v.array(
      v.object({
        messageId: v.string(),
        direction: v.union(v.literal('outbound'), v.literal('inbound')),
        from: v.string(),
        to: v.array(v.string()),
        timestamp: v.string(),
        body: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) =>
    await ctx.runAction(readMailThread, {
      sessionId: args.sessionId,
      foundThreadId: args.threadId,
      outreachId: args.outreachId,
    }),
})

export const markRead = mutation({
  args: { ...SessionIdArg, outreachId: v.id('outreachDrafts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.outreachId, args.sessionId)
    if (draft.unreadReplyCount > 0) {
      await ctx.db.patch('outreachDrafts', draft._id, {
        unreadReplyCount: 0,
      })
    }
    return null
  },
})
