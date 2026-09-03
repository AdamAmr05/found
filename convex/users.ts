import {
  type GoogleProfile,
  vGoogleProfile,
} from '@convex-dev/auth/providers/oauth/google'
import { v } from 'convex/values'

import type { Doc } from './_generated/dataModel'
import { internalMutation, query } from './_generated/server'
import { viewerId } from './viewer'

type UserFields = Omit<Doc<'users'>, '_id' | '_creationTime'>

const vViewer = v.object({
  _id: v.id('users'),
  displayName: v.string(),
  email: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
})

// Google attests the email; an unverified one must not become account data.
function userFieldsFromGoogle(profile: GoogleProfile): UserFields {
  const verifiedEmail = profile.emailVerified ? profile.email : undefined
  const fields: UserFields = {
    displayName: profile.name ?? verifiedEmail ?? 'Google account',
  }
  if (verifiedEmail) fields.email = verifiedEmail
  if (profile.picture) fields.imageUrl = profile.picture
  return fields
}

// Convex Auth calls these once per new account. Each provider gets its own
// mutation because the callback contract is typed with the provider's exact
// name and profile shape.
export const createFromPassword = internalMutation({
  args: {
    provider: v.literal('password'),
    providerAccountId: v.string(),
    profile: v.object({ username: v.string() }),
  },
  returns: v.id('users'),
  handler: async (ctx, args) =>
    await ctx.db.insert('users', { displayName: args.profile.username }),
})

export const createFromGoogle = internalMutation({
  args: {
    provider: v.literal('google'),
    providerAccountId: v.string(),
    profile: vGoogleProfile,
  },
  returns: v.id('users'),
  handler: async (ctx, args) =>
    await ctx.db.insert('users', userFieldsFromGoogle(args.profile)),
})

// Runs on every Google sign-in so a renamed account or new photo lands here.
export const syncGoogleProfile = internalMutation({
  args: {
    provider: v.literal('google'),
    providerAccountId: v.string(),
    profile: vGoogleProfile,
    userId: v.id('users'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get('users', args.userId)
    if (!user) return null
    await ctx.db.replace('users', user._id, userFieldsFromGoogle(args.profile))
    return null
  },
})

export const viewer = query({
  args: {},
  returns: v.union(v.null(), vViewer),
  handler: async (ctx) => {
    const userId = await viewerId(ctx)
    const user = userId === null ? null : await ctx.db.get('users', userId)
    if (!user) return null
    const view: typeof vViewer.type = {
      _id: user._id,
      displayName: user.displayName,
    }
    if (user.email) view.email = user.email
    if (user.imageUrl) view.imageUrl = user.imageUrl
    return view
  },
})
