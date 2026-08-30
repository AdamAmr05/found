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
    }),
  ),
})

export type OutreachMailThread = Infer<typeof vOutreachMailThread>
