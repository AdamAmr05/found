import { setupCore } from '@convex-dev/auth/core/setup'
import { setupGoogle } from '@convex-dev/auth/providers/oauth/google'
import { setupUsernamePassword } from '@convex-dev/auth/providers/password/setup'

import { components, internal } from './_generated/api'
import { allowedAppOrigins } from './appOrigins'

// Convex Auth v2 (alpha). The core owns sessions and token minting; each
// provider verifies an identity its own way and hands it to the core. The
// app owns the `users` table through the callbacks in users.ts.
const core = setupCore({ component: components.auth })

export const { signOut, refreshSession, isAuthenticated } = core

export const { signUpWithPassword, signInWithPassword } = setupUsernamePassword(
  core,
  {
    component: components.authPasswordProvider,
    usernameComponent: components.authUsername,
  },
).attachUserCallbacks({ createUser: internal.users.createFromPassword })

export const { startSignInGoogle, completeSignInGoogle } = setupGoogle(core, {
  component: components.oauthGoogle,
  allowedRedirectOrigins: allowedAppOrigins(),
}).attachUserCallbacks({
  createUser: internal.users.createFromGoogle,
  onSignIn: internal.users.syncGoogleProfile,
})
