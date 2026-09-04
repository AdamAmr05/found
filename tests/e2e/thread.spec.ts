import { expect, test } from '@playwright/test'

import { signUpFreshAccount } from './auth'

test('starts from a focused accommodation conversation', async ({ page }) => {
  await signUpFreshAccount(page)

  await expect(
    page.getByRole('heading', { name: 'Where would you like to live?' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Playground' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Lab' })).toBeVisible()

  const composer = page.getByRole('textbox', { name: 'Message Found' })
  const send = page.getByRole('button', { name: 'Send message' })
  const beam = page.locator('[data-beam]')
  await expect(send).toBeDisabled()
  await expect(beam).toHaveAttribute('data-active', '')

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
  await composer.blur()
  await expect(beam).not.toHaveAttribute('data-active')
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
    page.getByRole('heading', { name: 'Where would you like to live?' }),
  ).toBeVisible()
  await expect(composer).toBeEnabled()
  await expect(send).toBeDisabled()
  await expect(beam).toHaveAttribute('data-active', '')

  const starters = page.getByRole('group', { name: 'Start a conversation' })
  const firstStarter = starters.getByRole('button').first()
  const selectedPrompt = await firstStarter.innerText()
  await firstStarter.click()
  await expect(starters).toHaveCount(0)
  await expect(page.getByText(selectedPrompt, { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText(selectedPrompt, { exact: true })).toBeVisible()
})

test('keeps the idle screen usable on a small viewport with reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 640 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signUpFreshAccount(page)

  const starters = page.getByRole('group', { name: 'Start a conversation' })
  await expect(starters.getByRole('button')).toHaveCount(4)
  for (const starter of await starters.getByRole('button').all()) {
    await starter.scrollIntoViewIfNeeded()
    await expect(starter).toBeInViewport()
    await expect
      .poll(() =>
        starter
          .locator('img')
          .evaluate(
            (img) => img instanceof HTMLImageElement && img.naturalWidth > 0,
          ),
      )
      .toBe(true)
  }

  const composer = page.getByRole('textbox', { name: 'Message Found' })
  await composer.scrollIntoViewIfNeeded()
  await expect(composer).toBeInViewport()
  await expect(page.locator('[data-beam]')).not.toHaveAttribute('data-active')
  await composer.fill('A quiet place near a train station')
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled()
  expect(
    await starters.evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return rect.left >= 0 && rect.right <= window.innerWidth
    }),
  ).toBe(true)
})
