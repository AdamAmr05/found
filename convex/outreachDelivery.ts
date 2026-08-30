import {
  AgentMail,
  type OutboundId,
  vEvent,
  vOutboundStatus,
} from '@agentmail/convex'
import { ConvexError, v } from 'convex/values'
import { SessionIdArg } from 'convex-helpers/server/sessions'
import { z } from 'zod'

import { components, internal } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { env, internalMutation, mutation, query } from './_generated/server'
import {
  normalizeOutreachRecipient,
  normalizeOutreachSubject,
  outreachContentHash,
  validateOutreachContent,
} from './outreachContent'
import { ownedDraft } from './outreachDrafts'

const agentmail = new AgentMail(components.agentmail)

const inboundMessageSchema = z.object({
  inbox_id: z.string(),
  message_id: z.string(),
  thread_id: z.string(),
  in_reply_to: z.string().optional(),
})

const outboundEventSchema = z.object({
  message_id: z.string(),
  thread_id: z.string().optional(),
})

function outboundId(value: string): OutboundId {
  // SAFETY: The value was minted by the AgentMail component and persisted unchanged.
  return value as OutboundId
}

type OutreachPatch = Partial<
  Omit<Doc<'outreachDrafts'>, '_id' | '_creationTime'>
>

function isTerminalOutreachState(state: Doc<'outreachDrafts'>['state']) {
  return state === 'replied' || state === 'failed'
}

export const send = mutation({
  args: { ...SessionIdArg, draftId: v.id('outreachDrafts') },
  returns: v.string(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId, args.sessionId)
    if (draft.state !== 'approved' || !draft.approvedHash) {
      throw new ConvexError({ code: 'OUTREACH_APPROVAL_REQUIRED' })
    }
    const inboxId = env.AGENTMAIL_INBOX_ID
    if (!inboxId) {
      throw new ConvexError({ code: 'AGENTMAIL_INBOX_NOT_CONFIGURED' })
    }

    const recipient = normalizeOutreachRecipient(draft.recipient)
    const subject = normalizeOutreachSubject(draft.subject)
    validateOutreachContent({ recipient, subject, body: draft.body })
    const currentHash = await outreachContentHash({
      inboxId,
      recipient,
      subject,
      body: draft.body,
    })
    if (currentHash !== draft.approvedHash) {
      throw new ConvexError({ code: 'OUTREACH_CONTENT_CHANGED' })
    }

    const outbound = await agentmail.sendMessage(ctx, inboxId, {
      to: recipient,
      subject,
      text: draft.body,
      labels: ['found-outreach'],
    })
    await ctx.db.patch('outreachDrafts', draft._id, {
      outboundId: outbound,
      agentmailMessageId: undefined,
      agentmailThreadId: undefined,
      state: 'queued',
      latestActivityAt: Date.now(),
    })
    await ctx.scheduler.runAfter(0, internal.outreachDelivery.syncOutbound, {
      draftId: draft._id,
      outboundId: outbound,
      attempt: 0,
    })
    return outbound
  },
})

export const status = query({
  args: { ...SessionIdArg, draftId: v.id('outreachDrafts') },
  returns: v.union(
    v.null(),
    v.object({
      status: vOutboundStatus,
      agentmailMessageId: v.union(v.string(), v.null()),
      threadId: v.union(v.string(), v.null()),
      errorMessage: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId, args.sessionId)
    if (!draft.outboundId) return null
    return await agentmail.status(ctx, outboundId(draft.outboundId))
  },
})

export const syncOutbound = internalMutation({
  args: {
    draftId: v.id('outreachDrafts'),
    outboundId: v.string(),
    attempt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const current = await agentmail.status(ctx, outboundId(args.outboundId))
    if (!current) return null
    await ctx.runMutation(internal.outreachDelivery.applyOutboundStatus, {
      draftId: args.draftId,
      outboundId: args.outboundId,
      attempt: args.attempt,
      ...current,
    })
    return null
  },
})

export const applyOutboundStatus = internalMutation({
  args: {
    draftId: v.id('outreachDrafts'),
    outboundId: v.string(),
    attempt: v.number(),
    status: vOutboundStatus,
    agentmailMessageId: v.union(v.string(), v.null()),
    threadId: v.union(v.string(), v.null()),
    errorMessage: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get('outreachDrafts', args.draftId)
    if (
      !draft ||
      draft.outboundId !== args.outboundId ||
      isTerminalOutreachState(draft.state)
    ) {
      return null
    }
    const failed =
      args.status === 'failed' ||
      args.status === 'bounced' ||
      args.status === 'complained' ||
      args.status === 'rejected'
    const patch: OutreachPatch = {
      state: failed ? 'failed' : args.status === 'pending' ? 'queued' : 'sent',
      latestActivityAt: Date.now(),
    }
    if (args.agentmailMessageId) {
      patch.agentmailMessageId = args.agentmailMessageId
    }
    if (args.threadId) patch.agentmailThreadId = args.threadId
    await ctx.db.patch('outreachDrafts', draft._id, patch)
    if (args.status === 'pending' && args.attempt < 6) {
      await ctx.scheduler.runAfter(
        1_000 * 2 ** args.attempt,
        internal.outreachDelivery.syncOutbound,
        {
          draftId: draft._id,
          outboundId: args.outboundId,
          attempt: args.attempt + 1,
        },
      )
    }
    return null
  },
})

export const onMessageReceived = internalMutation({
  args: {
    // The component callback is an untyped SDK boundary; parse it immediately.
    message: v.any(),
    thread: v.any(),
    eventId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const parsed = inboundMessageSchema.safeParse(args.message)
    if (!parsed.success) return null
    const byThread = await ctx.db
      .query('outreachDrafts')
      .withIndex('by_agentmail_thread', (index) =>
        index.eq('agentmailThreadId', parsed.data.thread_id),
      )
      .order('desc')
      .first()
    const draft =
      byThread ??
      (parsed.data.in_reply_to
        ? await ctx.db
            .query('outreachDrafts')
            .withIndex('by_agentmail_message', (index) =>
              index.eq('agentmailMessageId', parsed.data.in_reply_to),
            )
            .unique()
        : null)
    if (!draft) return null
    await ctx.db.patch('outreachDrafts', draft._id, {
      state: 'replied',
      agentHasUnreadReply: true,
      unreadReplyCount: draft.unreadReplyCount + 1,
      latestActivityAt: Date.now(),
    })
    return null
  },
})

export const onEvent = internalMutation({
  args: { event: vEvent },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (
      args.event.event_type === 'message.received' ||
      args.event.event_type === 'domain.verified'
    ) {
      return null
    }
    const payload =
      args.event.send ??
      args.event.delivery ??
      args.event.bounce ??
      args.event.complaint ??
      args.event.reject
    const parsed = outboundEventSchema.safeParse(payload)
    if (!parsed.success) return null
    const draft = await ctx.db
      .query('outreachDrafts')
      .withIndex('by_agentmail_message', (index) =>
        index.eq('agentmailMessageId', parsed.data.message_id),
      )
      .unique()
    if (!draft || isTerminalOutreachState(draft.state)) return null
    const failed =
      args.event.event_type === 'message.bounced' ||
      args.event.event_type === 'message.complained' ||
      args.event.event_type === 'message.rejected'
    const patch: OutreachPatch = {
      state: failed ? 'failed' : 'sent',
      latestActivityAt: Date.now(),
    }
    if (parsed.data.thread_id) {
      patch.agentmailThreadId = parsed.data.thread_id
    }
    await ctx.db.patch('outreachDrafts', draft._id, patch)
    return null
  },
})
