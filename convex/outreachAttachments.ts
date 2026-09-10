import { ConvexError, type Infer, v } from 'convex/values'
import { z } from 'zod'

import {
  OUTREACH_ATTACHMENT_MAX_BYTES,
  OUTREACH_MESSAGE_MAX_ATTACHMENTS,
  OUTREACH_THREAD_MAX_MESSAGES,
} from '../shared/foundTools'
import type { Doc } from './_generated/dataModel'
import {
  type MutationCtx,
  internalMutation,
  mutation,
  query,
} from './_generated/server'
import { enqueueTransfer } from './outreachAttachmentTransfers'
import { ownedDraft, viewerDraft } from './outreachDrafts'
import {
  type OutreachMailAttachment,
  vOutreachAttachmentDisposition,
  vOutreachMailAttachment,
} from './outreachModel'

// AgentMail's webhook and thread payloads describe attachments; the bytes stay
// behind a short-lived download URL. This module records the description in
// the same transaction as the reply and moves the bytes into Convex storage
// through an idempotent scheduled transfer, so the Inbox can serve them after
// AgentMail's URL has expired.

/** One attachment as AgentMail describes it on a message. */
export const vAgentMailAttachment = v.object({
  attachment_id: v.string(),
  size: v.number(),
  filename: v.optional(v.string()),
  content_type: v.optional(v.string()),
  content_disposition: v.optional(vOutreachAttachmentDisposition),
  content_id: v.optional(v.string()),
})

type AttachmentPayload = Infer<typeof vAgentMailAttachment>

const attachmentPayloadSchema = z.object({
  attachment_id: z.string().min(1),
  size: z.number().int().nonnegative(),
  filename: z.string().optional(),
  content_type: z.string().optional(),
  content_disposition: z.enum(['inline', 'attachment']).optional(),
  content_id: z.string().optional(),
})

/**
 * The attachments AgentMail described on one message. Each entry is parsed on
 * its own so one malformed entry never hides the reply or its siblings.
 */
export function inboundAttachments(
  values: readonly unknown[] | undefined,
): AttachmentPayload[] {
  return (values ?? []).flatMap((value) => {
    const parsed = attachmentPayloadSchema.safeParse(value)
    if (!parsed.success) return []
    // Absent optional keys stay absent so the value satisfies the validator.
    const payload: AttachmentPayload = {
      attachment_id: parsed.data.attachment_id,
      size: parsed.data.size,
    }
    if (parsed.data.filename !== undefined) {
      payload.filename = parsed.data.filename
    }
    if (parsed.data.content_type !== undefined) {
      payload.content_type = parsed.data.content_type
    }
    if (parsed.data.content_disposition !== undefined) {
      payload.content_disposition = parsed.data.content_disposition
    }
    if (parsed.data.content_id !== undefined) {
      payload.content_id = parsed.data.content_id
    }
    return [payload]
  })
}

function disposition(payload: AttachmentPayload): 'inline' | 'attachment' {
  if (payload.content_disposition) return payload.content_disposition
  return payload.content_id ? 'inline' : 'attachment'
}

function displayName(filename: string | undefined): string {
  return filename?.trim() || 'Unnamed attachment'
}

export function toMailAttachment(
  payload: AttachmentPayload,
): OutreachMailAttachment {
  return {
    attachmentId: payload.attachment_id,
    filename: displayName(payload.filename),
    contentType: payload.content_type ?? null,
    size: payload.size,
    disposition: disposition(payload),
  }
}

type InboundMessageAttachments = {
  inboxId: string
  messageId: string
  attachments: readonly AttachmentPayload[]
}

/**
 * Record the attachments on an inbound reply and start moving their bytes.
 * Runs inside the reply mutation so the rows commit with the reply state.
 */
export async function recordInboundAttachments(
  ctx: MutationCtx,
  draft: Doc<'outreachDrafts'>,
  message: InboundMessageAttachments,
): Promise<void> {
  const payloads = message.attachments.slice(
    0,
    OUTREACH_MESSAGE_MAX_ATTACHMENTS,
  )
  for (const payload of payloads) {
    const existing = await ctx.db
      .query('outreachAttachments')
      .withIndex('by_message_and_attachment', (index) =>
        index
          .eq('messageId', message.messageId)
          .eq('attachmentId', payload.attachment_id),
      )
      .unique()
    if (existing) continue
    const transfer: Doc<'outreachAttachments'>['transfer'] =
      payload.size > OUTREACH_ATTACHMENT_MAX_BYTES
        ? { status: 'skipped', reason: 'too_large' }
        : { status: 'pending', attempt: 0 }
    const row: Omit<Doc<'outreachAttachments'>, '_id' | '_creationTime'> = {
      userId: draft.userId,
      outreachId: draft._id,
      inboxId: message.inboxId,
      messageId: message.messageId,
      attachmentId: payload.attachment_id,
      size: payload.size,
      disposition: disposition(payload),
      transfer,
    }
    if (payload.filename) row.filename = payload.filename
    if (payload.content_type) row.contentType = payload.content_type
    if (payload.content_id) row.contentId = payload.content_id
    const id = await ctx.db.insert('outreachAttachments', row)
    if (transfer.status === 'pending') {
      await enqueueTransfer(ctx, id)
    }
  }
}

/**
 * Record attachments seen while reading a thread. Replies that arrived before
 * attachment capture existed, or whose webhook was missed, are picked up here.
 */
export const recordFromThread = internalMutation({
  args: {
    userId: v.id('users'),
    outreachId: v.id('outreachDrafts'),
    inboxId: v.string(),
    messages: v.array(
      v.object({
        messageId: v.string(),
        attachments: v.array(vAgentMailAttachment),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.outreachId, args.userId)
    for (const message of args.messages.slice(
      0,
      OUTREACH_THREAD_MAX_MESSAGES,
    )) {
      await recordInboundAttachments(ctx, draft, {
        inboxId: args.inboxId,
        messageId: message.messageId,
        attachments: message.attachments,
      })
    }
    return null
  },
})

const vAttachmentView = vOutreachMailAttachment.extend({
  id: v.id('outreachAttachments'),
  messageId: v.string(),
  status: v.union(
    v.literal('pending'),
    v.literal('stored'),
    v.literal('skipped'),
    v.literal('failed'),
  ),
  url: v.union(v.string(), v.null()),
})

export const listForMessage = query({
  args: { outreachId: v.id('outreachDrafts'), messageId: v.string() },
  returns: v.array(vAttachmentView),
  handler: async (ctx, args) => {
    await viewerDraft(ctx, args.outreachId)
    const rows = await ctx.db
      .query('outreachAttachments')
      .withIndex('by_outreach_and_message', (index) =>
        index.eq('outreachId', args.outreachId).eq('messageId', args.messageId),
      )
      .take(OUTREACH_MESSAGE_MAX_ATTACHMENTS)
    return await Promise.all(
      rows.map(async (row) => ({
        id: row._id,
        messageId: row.messageId,
        attachmentId: row.attachmentId,
        filename: displayName(row.filename),
        contentType: row.contentType ?? null,
        size: row.size,
        disposition: row.disposition,
        status: row.transfer.status,
        url:
          row.transfer.status === 'stored'
            ? await ctx.storage.getUrl(row.transfer.storageId)
            : null,
      })),
    )
  },
})

export const retry = mutation({
  args: { id: v.id('outreachAttachments') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const row = await ctx.db.get('outreachAttachments', args.id)
    if (!row) throw new ConvexError({ code: 'OUTREACH_ATTACHMENT_NOT_FOUND' })
    await viewerDraft(ctx, row.outreachId)
    if (row.transfer.status !== 'failed') return null
    await ctx.db.patch('outreachAttachments', row._id, {
      transfer: { status: 'pending', attempt: 0 },
    })
    await enqueueTransfer(ctx, row._id)
    return null
  },
})
