import { expect, test } from '@playwright/test'
import { signUpFreshAccount } from './auth'

test('opens the public landing page and gates workspace deep links', async ({
  page,
}) => {
  await page.goto('/')
  const open = page.getByRole('link', { name: 'Open found', exact: true })
  await expect(open).toBeVisible()
  await expect(page.getByLabel('Username')).toHaveCount(0)
  await open.click()
  await expect(page).toHaveURL(/\/app\/?$/)
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Back to found' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(open).toBeVisible()
  await page.goto('/app/bookmarks')
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Bookmarks', exact: true }),
  ).toHaveCount(0)
})

test('returns home and reopens the workspace with a verified session', async ({
  page,
}) => {
  await signUpFreshAccount(page)
  await page.getByRole('link', { name: 'found', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.reload()
  await page.getByRole('link', { name: 'Open found', exact: true }).click()
  await expect(
    page.getByRole('textbox', { name: 'Message Found' }),
  ).toBeEnabled()
  await expect(page.getByLabel('Username')).toHaveCount(0)
  await page.getByRole('link', { name: 'Inbox', exact: true }).click()
  await expect(page).toHaveURL(/\/app\/inbox$/)
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Inbox', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(
    page.getByRole('heading', { name: 'Sign in', exact: true }),
  ).toBeVisible()
})
