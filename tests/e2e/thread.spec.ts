import { expect, test } from '@playwright/test'

import { signUpFreshAccount } from './auth'

test('starts from a focused accommodation conversation', async ({ page }) => {
  await signUpFreshAccount(page)

  await expect(
    page.getByRole('heading', { name: 'Where do you need to live?' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Playground' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Lab' })).toBeVisible()

  const composer = page.getByRole('textbox', { name: 'Message Found' })
  const send = page.getByRole('button', { name: 'Send message' })
  await expect(send).toBeDisabled()

  await expect
    .poll(() => composer.evaluate((node) => node.clientHeight))
    .toBe(40)
  await composer.fill(
    'I need somewhere quiet, furnished, close to transit, and flexible enough for a short stay while I settle into the city.',
  )
  await expect
    .poll(() => composer.evaluate((node) => node.clientHeight))
    .toBeGreaterThan(40)
  await composer.fill('')
  await expect
    .poll(() => composer.evaluate((node) => node.clientHeight))
    .toBe(40)

  await composer.fill('I need a place in Berlin')
  await expect(send).toBeEnabled()
  await composer.press('Shift+Enter')
  await composer.type('from October.')
  await expect(composer).toHaveValue('I need a place in Berlin\nfrom October.')

  await composer.press('Enter')
  const savedPrompt = page.getByText(
    'I need a place in Berlin\nfrom October.',
    { exact: true },
  )
  await expect(savedPrompt).toBeVisible()

  await page.reload()
  await expect(savedPrompt).toBeVisible()
  await page.getByRole('button', { name: 'New thread' }).click()
  await expect(
    page.getByRole('heading', { name: 'Where do you need to live?' }),
  ).toBeVisible()
  await expect(composer).toBeEnabled()
  await expect(send).toBeDisabled()
})
