import { type Infer, v } from 'convex/values'

export const vOutreachState = v.union(
  v.literal('draft'),
  v.literal('approved'),
  v.literal('queued'),
  v.literal('sent'),
  v.literal('replied'),
  v.literal('failed'),
  v.literal('uncertain'),
)

export const vOutreachProposal = v.object({
  recipient: v.string(),
  subject: v.string(),
  body: v.string(),
  instruction: v.string(),
  baseRevision: v.number(),
  createdAt: v.number(),
})

export const vOutreachRevisionRequest = v.object({
  requestId: v.string(),
  baseRevision: v.number(),
  startedAt: v.number(),
})

export const vOutreachAttachmentDisposition = v.union(
  v.literal('inline'),
  v.literal('attachment'),
)

/**
 * Where an inbound attachment's bytes are. AgentMail's webhook only carries
 * metadata; the bytes move into Convex storage through a scheduled transfer.
 */
export const vOutreachAttachmentTransfer = v.union(
  v.object({ status: v.literal('pending'), attempt: v.number() }),
  v.object({
    status: v.literal('stored'),
    storageId: v.id('_storage'),
    storedAt: v.number(),
  }),
  v.object({ status: v.literal('skipped'), reason: v.literal('too_large') }),
  v.object({
    status: v.literal('failed'),
    reason: v.string(),
    attempt: v.number(),
  }),
)

export const vOutreachMailAttachment = v.object({
  attachmentId: v.string(),
  filename: v.string(),
  contentType: v.union(v.string(), v.null()),
  size: v.number(),
  disposition: vOutreachAttachmentDisposition,
})

export type OutreachMailAttachment = Infer<typeof vOutreachMailAttachment>

export const vOutreachMailThread = v.object({
  outreachId: v.string(),
  candidateTitle: v.string(),
  subject: v.string(),
  observedReplyRevision: v.number(),
  omittedMessageCount: v.number(),
  messages: v.array(
    v.object({
      messageId: v.string(),
      direction: v.union(v.literal('outbound'), v.literal('inbound')),
      from: v.string(),
      to: v.array(v.string()),
      timestamp: v.string(),
      body: v.string(),
      bodyTruncated: v.boolean(),
      attachments: v.array(vOutreachMailAttachment),
    }),
  ),
})

export type OutreachMailThread = Infer<typeof vOutreachMailThread>
