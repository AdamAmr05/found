import { ConvexError } from 'convex/values'

import { components } from './_generated/api'
import type { Id } from './_generated/dataModel'
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
  userId: Id<'users'>,
): Promise<void> {
  if (!(await hasThreadAccess(ctx, threadId, userId))) {
    throw new ConvexError({ code: 'THREAD_NOT_FOUND' })
  }
}

// Agent component threads store the owning Found user id as their userId.
export async function hasThreadAccess(
  ctx: ThreadAccessCtx,
  threadId: string,
  userId: Id<'users'>,
): Promise<boolean> {
  const thread = await ctx
    .runQuery(components.agent.threads.getThread, { threadId })
    .catch((error) => {
      if (error instanceof Error && isInvalidAgentThreadId(error)) {
        return null
      }
      throw error
    })
  return Boolean(thread && thread.userId === userId)
}
