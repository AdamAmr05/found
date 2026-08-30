import { AgentMail } from '@agentmail/convex'
import { makeFunctionReference } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import { vSessionId } from 'convex-helpers/server/sessions'
import type { SessionId } from 'convex-helpers/server/sessions'
import { z } from 'zod'

import { components } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  env,
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server'
import { ownedDraft } from './outreachDrafts'
import { assertThreadOwner } from './threadAccess'

const agentmail = new AgentMail(components.agentmail)

type ThreadDetails = {
  candidateTitle: string
  subject: string
  agentmailThreadId: string
}

const getThreadDetails = makeFunctionReference<
  'query',
  {
    sessionId: SessionId
    foundThreadId: string
    outreachId: Id<'outreachDrafts'>
  },
  ThreadDetails | null
>('outreachMailbox:detailsForAgent')

const markThreadRead = makeFunctionReference<
  'mutation',
  { sessionId: SessionId; outreachId: Id<'outreachDrafts'> },
  null
>('outreachMailbox:markReadForAgent')

const addressSchema = z.union([z.string(), z.array(z.string())])
const messageSchema = z.object({
  message_id: z.string(),
  timestamp: z.string(),
  from: addressSchema,
  to: z.array(z.string()).default([]),
  text: z.string().optional(),
  extracted_text: z.string().optional(),
  preview: z.string().optional(),
})
const threadSchema = z.object({
  messages: z.array(messageSchema).max(100),
})

const vUpdate = v.object({
  outreachId: v.string(),
  candidateTitle: v.string(),
  state: v.union(
    v.literal('draft'),
    v.literal('approved'),
    v.literal('queued'),
    v.literal('sent'),
    v.literal('replied'),
    v.literal('failed'),
  ),
  hasUnreadReply: v.boolean(),
  latestActivityAt: v.number(),
})

const vRunDraft = v.object({
  outreachId: v.id('outreachDrafts'),
  candidateTitle: v.string(),
  recipient: v.string(),
  subject: v.string(),
  body: v.string(),
  revision: v.number(),
})

export const listForAgent = internalQuery({
  args: { sessionId: vSessionId, threadId: v.string() },
  returns: v.array(vUpdate),
  handler: async (ctx, args) => {
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    const drafts = await ctx.db
      .query('outreachDrafts')
      .withIndex('by_session_and_thread_and_latest_activity', (index) =>
        index.eq('sessionId', args.sessionId).eq('threadId', args.threadId),
      )
      .order('desc')
      .take(50)
    return drafts.map((draft) => ({
      outreachId: draft._id,
      candidateTitle: draft.candidateTitle,
      state: draft.state,
      hasUnreadReply: draft.unreadReplyCount > 0,
      latestActivityAt: draft.latestActivityAt,
    }))
  },
})

export const contextForRun = internalQuery({
  args: { sessionId: vSessionId, threadId: v.string() },
  returns: v.object({
    changedDrafts: v.array(vRunDraft),
    unreadReplies: v.array(
      v.object({
        outreachId: v.id('outreachDrafts'),
        candidateTitle: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    const drafts = await ctx.db
      .query('outreachDrafts')
      .withIndex('by_session_and_thread_and_latest_activity', (index) =>
        index.eq('sessionId', args.sessionId).eq('threadId', args.threadId),
      )
      .order('desc')
      .take(50)
    return {
      changedDrafts: drafts.flatMap((draft) =>
        draft.revision > draft.lastAgentSeenRevision
          ? [
              {
                outreachId: draft._id,
                candidateTitle: draft.candidateTitle,
                recipient: draft.recipient,
                subject: draft.subject,
                body: draft.body,
                revision: draft.revision,
              },
            ]
          : [],
      ),
      unreadReplies: drafts.flatMap((draft) =>
        draft.unreadReplyCount > 0
          ? [
              {
                outreachId: draft._id,
                candidateTitle: draft.candidateTitle,
              },
            ]
          : [],
      ),
    }
  },
})

export const markAgentSeen = internalMutation({
  args: {
    sessionId: vSessionId,
    threadId: v.string(),
    revisions: v.array(
      v.object({
        outreachId: v.id('outreachDrafts'),
        revision: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    for (const seen of args.revisions.slice(0, 50)) {
      const draft = await ctx.db.get('outreachDrafts', seen.outreachId)
      if (
        draft?.sessionId === args.sessionId &&
        draft.threadId === args.threadId &&
        seen.revision > draft.lastAgentSeenRevision &&
        seen.revision <= draft.revision
      ) {
        await ctx.db.patch('outreachDrafts', draft._id, {
          lastAgentSeenRevision: seen.revision,
        })
      }
    }
    return null
  },
})

export const detailsForAgent = internalQuery({
  args: {
    sessionId: vSessionId,
    foundThreadId: v.string(),
    outreachId: v.id('outreachDrafts'),
  },
  returns: v.union(
    v.null(),
    v.object({
      candidateTitle: v.string(),
      subject: v.string(),
      agentmailThreadId: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.outreachId, args.sessionId)
    if (draft.threadId !== args.foundThreadId || !draft.agentmailThreadId) {
      return null
    }
    return {
      candidateTitle: draft.candidateTitle,
      subject: draft.subject,
      agentmailThreadId: draft.agentmailThreadId,
    }
  },
})

export const readThread = internalAction({
  args: {
    sessionId: vSessionId,
    foundThreadId: v.string(),
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
  handler: async (ctx, args) => {
    const details = await ctx.runQuery(getThreadDetails, args)
    const inboxId = env.AGENTMAIL_INBOX_ID
    if (!details || !inboxId) {
      throw new ConvexError({ code: 'OUTREACH_THREAD_NOT_AVAILABLE' })
    }
    const response = threadSchema.parse(
      await agentmail.getThread(ctx, inboxId, details.agentmailThreadId),
    )
    await ctx.runMutation(markThreadRead, {
      sessionId: args.sessionId,
      outreachId: args.outreachId,
    })
    return {
      outreachId: args.outreachId,
      candidateTitle: details.candidateTitle,
      subject: details.subject,
      messages: response.messages.map((message) => {
        const from = Array.isArray(message.from)
          ? message.from.join(', ')
          : message.from
        return {
          messageId: message.message_id,
          direction: from.includes(inboxId)
            ? ('outbound' as const)
            : ('inbound' as const),
          from,
          to: message.to,
          timestamp: message.timestamp,
          body: (
            message.extracted_text ??
            message.text ??
            message.preview ??
            ''
          ).slice(0, 16_000),
        }
      }),
    }
  },
})

export const markReadForAgent = internalMutation({
  args: { sessionId: vSessionId, outreachId: v.id('outreachDrafts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.outreachId, args.sessionId)
    if (draft.unreadReplyCount > 0) {
      await ctx.db.patch('outreachDrafts', draft._id, { unreadReplyCount: 0 })
    }
    return null
  },
})
