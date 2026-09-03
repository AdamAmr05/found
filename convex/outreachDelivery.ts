import {
  AgentMail,
  type OutboundId,
  vEvent,
  vOutboundStatus,
} from '@agentmail/convex'
import { ConvexError, v } from 'convex/values'
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
import { viewerDraft } from './outreachDrafts'
import { vOutreachState } from './outreachModel'
import { replyRevision } from './outreachReplyState'

const agentmail = new AgentMail(components.agentmail)
const OUTBOUND_RECONCILIATION_HORIZON_MS = 30 * 60 * 1_000

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

function reconciliationDelayMs(attempt: number): number {
  if (attempt === 0) return 5_000
  const exponent = Math.min(Math.max(0, attempt - 1), 4)
  return Math.min(30_000 * 2 ** exponent, 300_000)
}

export const send = mutation({
  args: { draftId: v.id('outreachDrafts') },
  returns: v.string(),
  handler: async (ctx, args) => {
    const draft = await viewerDraft(ctx, args.draftId)
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
    const deliveryStartedAt = Date.now()
    await ctx.db.patch('outreachDrafts', draft._id, {
      outboundId: outbound,
      agentmailMessageId: undefined,
      agentmailThreadId: undefined,
      state: 'queued',
      deliveryStartedAt,
      latestActivityAt: deliveryStartedAt,
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
  args: { draftId: v.id('outreachDrafts') },
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
    const draft = await viewerDraft(ctx, args.draftId)
    if (!draft.outboundId) return null
    return await agentmail.status(ctx, outboundId(draft.outboundId))
  },
})

export const recheck = mutation({
  args: { draftId: v.id('outreachDrafts') },
  returns: vOutreachState,
  handler: async (ctx, args): Promise<Doc<'outreachDrafts'>['state']> => {
    const draft = await viewerDraft(ctx, args.draftId)
    if (draft.state !== 'uncertain') return draft.state
    if (!draft.outboundId) {
      throw new ConvexError({ code: 'OUTREACH_STATUS_NOT_AVAILABLE' })
    }
    const current = await agentmail.status(ctx, outboundId(draft.outboundId))
    if (!current) {
      throw new ConvexError({ code: 'OUTREACH_STATUS_NOT_AVAILABLE' })
    }
    if (current.status === 'pending') return 'uncertain'
    const state: Doc<'outreachDrafts'>['state'] | null = await ctx.runMutation(
      internal.outreachDelivery.applyOutboundStatus,
      {
        draftId: draft._id,
        outboundId: draft.outboundId,
        attempt: 0,
        ...current,
      },
    )
    if (!state) {
      throw new ConvexError({ code: 'OUTREACH_STATUS_NOT_AVAILABLE' })
    }
    return state
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
  returns: v.union(vOutreachState, v.null()),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get('outreachDrafts', args.draftId)
    if (
      !draft ||
      draft.outboundId !== args.outboundId ||
      isTerminalOutreachState(draft.state)
    ) {
      return draft?.state ?? null
    }
    const failed =
      args.status === 'failed' ||
      args.status === 'bounced' ||
      args.status === 'complained' ||
      args.status === 'rejected'
    const now = Date.now()
    const deliveryStartedAt = draft.deliveryStartedAt ?? draft.latestActivityAt
    const reconciliationExpired =
      args.status === 'pending' &&
      now - deliveryStartedAt >= OUTBOUND_RECONCILIATION_HORIZON_MS
    const patch: OutreachPatch = {
      state: failed
        ? 'failed'
        : reconciliationExpired
          ? 'uncertain'
          : args.status === 'pending'
            ? 'queued'
            : 'sent',
      deliveryStartedAt,
      latestActivityAt: now,
    }
    if (args.agentmailMessageId) {
      patch.agentmailMessageId = args.agentmailMessageId
    }
    if (args.threadId) patch.agentmailThreadId = args.threadId
    await ctx.db.patch('outreachDrafts', draft._id, patch)
    if (args.status === 'pending' && !reconciliationExpired) {
      await ctx.scheduler.runAfter(
        reconciliationDelayMs(args.attempt),
        internal.outreachDelivery.syncOutbound,
        {
          draftId: draft._id,
          outboundId: args.outboundId,
          attempt: args.attempt + 1,
        },
      )
    }
    return patch.state ?? draft.state
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
    const currentReplyRevision = replyRevision(draft)
    const nextReplyRevision = currentReplyRevision + 1
    await ctx.db.patch('outreachDrafts', draft._id, {
      state: 'replied',
      replyRevision: nextReplyRevision,
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
