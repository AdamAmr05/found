import { expect, type Page } from '@playwright/test'

// Creates a fresh password account through the real sign-in surface so each
// run owns its own threads and never depends on prior state.
export async function signUpFreshAccount(page: Page): Promise<string> {
  const username = `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  await page.goto('/')
  await page
    .getByRole('button', { name: 'New here? Create an account' })
    .click()
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill('correct-horse-battery-e2e')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
  return username
}
