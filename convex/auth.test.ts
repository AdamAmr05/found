/// <reference types="vite/client" />

import { register as registerAgent } from '@convex-dev/agent/test'
import coreSchema from '@convex-dev/auth/core/schema'
import { registerPasswordProvider } from '@convex-dev/auth/providers/testing/password'
import usernameSchema from '@convex-dev/auth/username/schema'
import { convexTest } from 'convex-test'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const coreModules = import.meta.glob(
  '../node_modules/@convex-dev/auth/src/components/core/**/*.ts',
)
const usernameModules = import.meta.glob(
  '../node_modules/@convex-dev/auth/src/components/username/**/*.ts',
)

const SITE_URL = 'https://found-test.convex.site'
const PASSWORD = 'correct-horse-battery-staple'

function base64(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

// The auth core signs access tokens with the deployment's RS256 key, stored
// the way `npx @convex-dev/auth` writes it: a base64 PKCS8 PEM plus its JWKS.
async function generateSigningKeys(): Promise<{
  privateKey: string
  jwks: string
}> {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )
  const pkcs8 = base64(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  const pem = `-----BEGIN PRIVATE KEY-----\n${pkcs8.replace(/(.{64})/g, '$1\n')}\n-----END PRIVATE KEY-----\n`
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  return {
    privateKey: btoa(pem),
    jwks: JSON.stringify({
      keys: [{ ...publicJwk, kid: 'test-key', alg: 'RS256', use: 'sig' }],
    }),
  }
}

function setup() {
  const t = convexTest(schema, modules)
  registerAgent(t)
  t.registerComponent('auth', coreSchema, coreModules)
  t.registerComponent('authUsername', usernameSchema, usernameModules)
  registerPasswordProvider(t)
  return t
}

// The core reads its keys and issuer from the environment on every call.
beforeEach(async () => {
  const keys = await generateSigningKeys()
  vi.stubEnv('CONVEX_SITE_URL', SITE_URL)
  vi.stubEnv('AUTH_PRIVATE_KEY', keys.privateKey)
  vi.stubEnv('AUTH_JWKS', keys.jwks)
})

afterEach(() => vi.unstubAllEnvs())

describe('password accounts', () => {
  test('creates a Found user for a new username and signs it in', async () => {
    const t = setup()

    const signedUp = await t.mutation(api.auth.signUpWithPassword, {
      username: 'Alice',
      password: PASSWORD,
    })
    expect(signedUp.success).toBe(true)
    if (!signedUp.success) return

    const userId = signedUp.tokens.userId
    await expect(
      t.run(async (ctx) => ctx.db.normalizeId('users', userId)),
    ).resolves.not.toBeNull()
    await expect(
      t.withIdentity({ subject: userId }).query(api.users.viewer, {}),
    ).resolves.toMatchObject({ _id: userId, displayName: 'Alice' })

    const signedIn = await t.mutation(api.auth.signInWithPassword, {
      username: 'alice',
      password: PASSWORD,
    })
    expect(signedIn).toMatchObject({
      success: true,
      tokens: { userId },
    })
  })

  test('rejects a wrong password and a duplicate username', async () => {
    const t = setup()
    await t.mutation(api.auth.signUpWithPassword, {
      username: 'alice',
      password: PASSWORD,
    })

    await expect(
      t.mutation(api.auth.signInWithPassword, {
        username: 'alice',
        password: `${PASSWORD}-not`,
      }),
    ).resolves.toEqual({
      success: false,
      userError: { error: 'INVALID_CREDENTIALS' },
    })
    await expect(
      t.mutation(api.auth.signUpWithPassword, {
        username: 'ALICE',
        password: PASSWORD,
      }),
    ).resolves.toEqual({
      success: false,
      userError: { error: 'USERNAME_TAKEN' },
    })
  })
})

describe('authorization boundary', () => {
  test('refuses user-owned functions without a verified session', async () => {
    const t = setup()

    await expect(t.query(api.users.viewer, {})).resolves.toBeNull()
    await expect(
      t.mutation(api.thread.start, { prompt: 'Somewhere in Berlin' }),
    ).rejects.toMatchObject({ data: { code: 'UNAUTHENTICATED' } })
    await expect(
      t.query(api.savedCandidates.listBookmarks, {
        paginationOpts: { cursor: null, numItems: 5 },
      }),
    ).rejects.toMatchObject({ data: { code: 'UNAUTHENTICATED' } })
  })

  test('only starts Google sign-in for an allowed app origin', async () => {
    const t = setup()

    await expect(
      t.mutation(api.auth.startSignInGoogle, {
        redirectTo: 'https://attacker.example/callback',
      }),
    ).rejects.toThrow(/not in allowedRedirectOrigins/)
  })
})
