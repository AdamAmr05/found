import { ConvexError } from 'convex/values'
import type { SessionId } from 'convex-helpers/server/sessions'

import { components } from './_generated/api'
import type { ActionCtx, MutationCtx, QueryCtx } from './_generated/server'

type ThreadAccessCtx = QueryCtx | MutationCtx | ActionCtx

function isInvalidAgentThreadId(error: Error): boolean {
  const message = error.message
  return (
    message.includes('Expected ID for table "threads"') ||
    (message.includes('ArgumentValidationError') &&
      message.includes('Path: .threadId') &&
      message.includes('v.id("threads")'))
  )
}

export async function assertThreadOwner(
  ctx: ThreadAccessCtx,
  threadId: string,
  sessionId: SessionId,
): Promise<void> {
  const thread = await ctx
    .runQuery(components.agent.threads.getThread, { threadId })
    .catch((error) => {
      if (error instanceof Error && isInvalidAgentThreadId(error)) {
        throw new ConvexError({ code: 'THREAD_NOT_FOUND' })
      }
      throw error
    })
  if (!thread || thread.userId !== sessionId) {
    throw new ConvexError({ code: 'THREAD_NOT_FOUND' })
  }
}
