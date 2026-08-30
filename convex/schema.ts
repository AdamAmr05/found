import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { vSessionId } from 'convex-helpers/server/sessions'

import { vOutreachProposal, vOutreachState } from './outreachModel'

const schema = defineSchema({
  candidatePartRefs: defineTable({
    sessionId: vSessionId,
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
  }).index('by_session_thread_tool', ['sessionId', 'threadId', 'toolCallId']),
  savedCandidates: defineTable({
    sessionId: vSessionId,
    threadId: v.string(),
    messageId: v.string(),
    toolCallId: v.string(),
    candidateRef: v.string(),
    imageSourceRef: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  })
    .index('by_session', ['sessionId'])
    .index('by_session_and_thread', ['sessionId', 'threadId'])
    .index('by_session_and_thread_and_tool_and_candidate', [
      'sessionId',
      'threadId',
      'toolCallId',
      'candidateRef',
    ]),
  outreachDrafts: defineTable({
    sessionId: vSessionId,
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
    approvedHash: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    outboundId: v.optional(v.string()),
    agentmailMessageId: v.optional(v.string()),
    agentmailThreadId: v.optional(v.string()),
    replyRevision: v.optional(v.number()),
    humanReadThroughReplyRevision: v.optional(v.number()),
    agentReadThroughReplyRevision: v.optional(v.number()),
    unreadReplyCount: v.number(),
    agentHasUnreadReply: v.optional(v.boolean()),
    proposal: v.optional(vOutreachProposal),
  })
    .index('by_session_and_thread_and_latest_activity', [
      'sessionId',
      'threadId',
      'latestActivityAt',
    ])
    .index('by_session_and_latest_activity', ['sessionId', 'latestActivityAt'])
    .index('by_thread_and_tool_call', ['threadId', 'toolCallId'])
    .index('by_agentmail_thread', ['agentmailThreadId'])
    .index('by_agentmail_message', ['agentmailMessageId']),
})

export default schema
