import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

import {
  vOutreachProposal,
  vOutreachRevisionRequest,
  vOutreachState,
} from './outreachModel'

const schema = defineSchema({
  // The app-owned account record behind a Convex Auth session. The auth core
  // stores only this document's id; provider accounts map onto it.
  users: defineTable({
    displayName: v.string(),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  }),
  candidatePartRefs: defineTable({
    userId: v.id('users'),
    threadId: v.string(),
    messageId: v.string(),
    toolCallId: v.string(),
    candidateRefs: v.array(v.string()),
    previewImages: v.optional(
      v.array(
        v.object({
          candidateRef: v.string(),
          sourceRef: v.optional(v.string()),
          url: v.string(),
        }),
      ),
    ),
  }).index('by_user_and_thread_and_tool_call', [
    'userId',
    'threadId',
    'toolCallId',
  ]),
  savedCandidates: defineTable({
    userId: v.id('users'),
    threadId: v.string(),
    messageId: v.string(),
    toolCallId: v.string(),
    candidateRef: v.string(),
    imageSourceRef: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_thread', ['userId', 'threadId'])
    .index('by_user_and_thread_and_tool_call_and_candidate', [
      'userId',
      'threadId',
      'toolCallId',
      'candidateRef',
    ]),
  outreachDrafts: defineTable({
    userId: v.id('users'),
    threadId: v.string(),
    toolCallId: v.string(),
    candidateRef: v.optional(v.string()),
    candidateTitle: v.string(),
    recipient: v.string(),
    subject: v.string(),
    body: v.string(),
    revision: v.number(),
    lastAgentSeenRevision: v.number(),
    state: vOutreachState,
    updatedAt: v.number(),
    latestActivityAt: v.number(),
    deliveryStartedAt: v.optional(v.number()),
    approvedHash: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    outboundId: v.optional(v.string()),
    agentmailMessageId: v.optional(v.string()),
    agentmailThreadId: v.optional(v.string()),
    replyRevision: v.number(),
    humanReadThroughReplyRevision: v.number(),
    agentReadThroughReplyRevision: v.number(),
    revisionRequest: v.optional(vOutreachRevisionRequest),
    proposal: v.optional(vOutreachProposal),
  })
    .index('by_user_and_thread_and_latest_activity', [
      'userId',
      'threadId',
      'latestActivityAt',
    ])
    .index('by_user_and_latest_activity', ['userId', 'latestActivityAt'])
    .index('by_thread_and_tool_call', ['threadId', 'toolCallId'])
    .index('by_agentmail_thread', ['agentmailThreadId'])
    .index('by_agentmail_message', ['agentmailMessageId']),
})

export default schema
