import type { Id } from '../_generated/dataModel'

type ToolRunContext = {
  readonly userId?: string | undefined
  readonly threadId?: string | undefined
}

/** The Found user and thread an agent tool call belongs to. */
export type ToolOwner = {
  readonly userId: Id<'users'>
  readonly threadId: string
}

/**
 * The Found user and thread an agent tool runs for. Found starts every run
 * with the signed-in user's id as the Agent component userId, and each
 * internal function called with it re-validates the value with v.id('users').
 */
export function requireToolOwner(ctx: ToolRunContext): ToolOwner {
  if (!ctx.userId || !ctx.threadId) {
    throw new Error('An owned Found thread is required for this tool.')
  }
  // SAFETY: The Agent component returns the run's userId as a plain string;
  // Found only ever supplies a `users` id there, and the callee validates it.
  return { userId: ctx.userId as Id<'users'>, threadId: ctx.threadId }
}
