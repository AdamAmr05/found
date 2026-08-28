import { ConvexError } from 'convex/values'
import type { SessionId } from 'convex-helpers/server/sessions'

import { components } from './_generated/api'
import type { ActionCtx, MutationCtx, QueryCtx } from './_generated/server'

type ThreadAccessCtx = QueryCtx | MutationCtx | ActionCtx

export async function assertThreadOwner(
  ctx: ThreadAccessCtx,
  threadId: string,
  sessionId: SessionId,
): Promise<void> {
  const thread = await ctx.runQuery(components.agent.threads.getThread, {
    threadId,
  })
  if (!thread || thread.userId !== sessionId) {
    throw new ConvexError({ code: 'THREAD_NOT_FOUND' })
  }
}
