import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { vSessionId } from 'convex-helpers/server/sessions'

export default defineSchema({
  candidatePartRefs: defineTable({
    sessionId: vSessionId,
    threadId: v.string(),
    toolCallId: v.string(),
    candidateRefs: v.array(v.string()),
  }).index('by_session_thread_tool', ['sessionId', 'threadId', 'toolCallId']),
  shortlistEntries: defineTable({
    sessionId: vSessionId,
    threadId: v.string(),
    toolCallId: v.string(),
    candidateRef: v.string(),
  }).index('by_session_thread_tool_candidate', [
    'sessionId',
    'threadId',
    'toolCallId',
    'candidateRef',
  ]),
})
