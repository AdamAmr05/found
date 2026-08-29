import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { vSessionId } from 'convex-helpers/server/sessions'

export default defineSchema({
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
})
