import { getAuthUserId } from '@convex-dev/auth/core'
import type { Auth } from 'convex/server'
import { ConvexError } from 'convex/values'

import type { Id } from './_generated/dataModel'

type AuthCtx = { readonly auth: Auth }

/**
 * The signed-in user behind the current request, or `null` for a caller with
 * no verified session. Convex verifies the access token signature against the
 * auth core's JWKS before any function runs, so this value is trustworthy.
 */
export async function viewerId(ctx: AuthCtx): Promise<Id<'users'> | null> {
  return await getAuthUserId(ctx)
}

/**
 * The signed-in user, for functions that only make sense with one. Every
 * public function that reads or writes user-owned data derives ownership
 * from here and never from an argument.
 */
export async function requireViewerId(ctx: AuthCtx): Promise<Id<'users'>> {
  const userId = await viewerId(ctx)
  if (userId === null) {
    throw new ConvexError({ code: 'UNAUTHENTICATED' })
  }
  return userId
}
