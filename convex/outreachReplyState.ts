import { ConvexError } from 'convex/values'

import type { Doc } from './_generated/dataModel'

type ReplyState = Pick<
  Doc<'outreachDrafts'>,
  | 'replyRevision'
  | 'humanReadThroughReplyRevision'
  | 'agentReadThroughReplyRevision'
>

export function replyRevision(state: ReplyState): number {
  return state.replyRevision
}

export function humanReadThroughReplyRevision(state: ReplyState): number {
  return state.humanReadThroughReplyRevision
}

export function agentReadThroughReplyRevision(state: ReplyState): number {
  return state.agentReadThroughReplyRevision
}

export function humanUnreadReplyCount(state: ReplyState): number {
  return Math.max(
    0,
    replyRevision(state) - humanReadThroughReplyRevision(state),
  )
}

export function agentHasUnreadReply(state: ReplyState): boolean {
  return replyRevision(state) > agentReadThroughReplyRevision(state)
}

export function observedReplyRevision(
  observedRevision: number,
  currentRevision: number,
): number {
  if (!Number.isSafeInteger(observedRevision) || observedRevision < 0) {
    throw new ConvexError({ code: 'OUTREACH_REPLY_REVISION_INVALID' })
  }
  return Math.min(observedRevision, currentRevision)
}
