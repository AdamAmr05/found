import { v } from 'convex/values'

export const vOutreachState = v.union(
  v.literal('draft'),
  v.literal('approved'),
  v.literal('queued'),
  v.literal('sent'),
  v.literal('replied'),
  v.literal('failed'),
)

export const vOutreachProposal = v.object({
  recipient: v.string(),
  subject: v.string(),
  body: v.string(),
  instruction: v.string(),
  baseRevision: v.number(),
  createdAt: v.number(),
})
