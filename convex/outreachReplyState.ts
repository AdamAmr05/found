import { ConvexError } from 'convex/values'

import type { Doc } from './_generated/dataModel'

type ReplyState = Pick<
  Doc<'outreachDrafts'>,
  | 'replyRevision'
  | 'humanReadThroughReplyRevision'
  | 'agentReadThroughReplyRevision'
  | 'unreadReplyCount'
  | 'agentHasUnreadReply'
>

export function replyRevision(state: ReplyState): number {
  return (
    state.replyRevision ??
    Math.max(state.unreadReplyCount, state.agentHasUnreadReply ? 1 : 0)
  )
}

export function humanReadThroughReplyRevision(state: ReplyState): number {
  const currentRevision = replyRevision(state)
  return (
    state.humanReadThroughReplyRevision ??
    Math.max(0, currentRevision - state.unreadReplyCount)
  )
}

export function agentReadThroughReplyRevision(state: ReplyState): number {
  const currentRevision = replyRevision(state)
  if (state.agentReadThroughReplyRevision !== undefined) {
    return state.agentReadThroughReplyRevision
  }
  return state.agentHasUnreadReply === false
    ? currentRevision
    : Math.max(0, currentRevision - 1)
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
