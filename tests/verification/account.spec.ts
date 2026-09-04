import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'
import { loadEnv } from 'vite'
import { z } from 'zod'

const accountSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(10),
  backend: z.url(),
})
const directory = '.cache/verification'
const accountPath = `${directory}/account.json`

test('prepares a reusable account and verifies real password sessions', async ({
  page,
  browser,
}) => {
  const env = loadEnv('development', process.cwd(), '')
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const account = existsSync(accountPath)
    ? accountSchema.parse(JSON.parse(readFileSync(accountPath, 'utf8')))
    : accountSchema.parse({
        username: `test-account-${randomBytes(4).toString('hex')}`,
        password: randomBytes(24).toString('base64url'),
        backend: env.VITE_CONVEX_URL,
      })
  expect(account.backend, 'Saved account belongs to this dev backend').toBe(
    env.VITE_CONVEX_URL,
  )
  // Save before signup so an interrupted run can reuse the same credentials.
  writeFileSync(accountPath, `${JSON.stringify(account, null, 2)}\n`, {
    mode: 0o600,
  })

  await page.goto('/')
  await page.getByLabel('Username').fill(account.username)
  await page.getByLabel('Password').fill(account.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const signOut = page.getByRole('button', { name: 'Sign out' })
  const invalidCredentials = page.getByRole('alert').filter({
    hasText: 'That username and password don’t match.',
  })
  await expect(signOut.or(invalidCredentials)).toBeVisible()
  if (await invalidCredentials.isVisible()) {
    await page.getByRole('button', { name: 'Sign up', exact: true }).click()
    await page.getByRole('button', { name: 'Create account' }).click()
  }
  await expect(signOut).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: 'Message Found' }),
  ).toBeEnabled()
  await page.reload()
  await expect(signOut).toBeVisible()
  await signOut.click()
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible()

  // A fresh browser context proves password login does not depend on the signup session.
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:3100',
  })
  try {
    const freshPage = await context.newPage()
    await freshPage.goto('/')
    await freshPage.getByLabel('Username').fill(account.username)
    await freshPage.getByLabel('Password').fill(account.password)
    await freshPage
      .getByRole('button', { name: 'Sign in', exact: true })
      .click()
    await expect(
      freshPage.getByRole('button', { name: 'Sign out' }),
    ).toBeVisible()
    await freshPage.screenshot({ path: `${directory}/signed-in.png` })
  } finally {
    await context.close()
  }
})
