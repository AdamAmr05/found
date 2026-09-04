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

  // A short viewport makes this real conversation scroll without depending on
  // the model's response length. Both empty margins must scroll the messages.
  await page.setViewportSize({ width: 1440, height: 232 })
  const conversation = page.getByRole('log')
  const scroller = conversation.locator(':scope > div').first()
  await expect
    .poll(() => scroller.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(40)
  const composerBounds = await composer.boundingBox()
  for (const x of [16, 1424]) {
    await scroller.evaluate((element) => {
      element.scrollTop = element.scrollHeight
    })
    const previousTop = await scroller.evaluate((element) => element.scrollTop)
    const bounds = await conversation.boundingBox()
    if (!bounds) throw new Error('Conversation is not laid out')
    await page.mouse.move(x, bounds.y + bounds.height / 2)
    await page.mouse.wheel(0, -120)
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollTop))
      .toBeLessThan(previousTop)
  }
  await expect(
    page.getByRole('button', { name: 'Jump to latest message' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Jump to latest message' }).click()
  await expect(
    page.getByRole('button', { name: 'Jump to latest message' }),
  ).toHaveCount(0)
  expect(await composer.boundingBox()).toEqual(composerBounds)
  await page.setViewportSize({ width: 1280, height: 720 })

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

  await page.getByRole('button', { name: 'New thread', exact: true }).click()
  await composer.fill('Keep this unfinished draft')
  await page
    .getByRole('button', { name: 'Thread history', exact: true })
    .click()
  const history = page.getByRole('navigation', { name: 'Conversations' })
  await expect(history.getByRole('listitem')).toHaveCount(2)
  const olderThread = history.getByRole('button', {
    name: /I need a place in Berlin/,
  })
  await olderThread.click()
  await expect(savedPrompt).toBeVisible()
  await expect(olderThread).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('log').getByText(selectedPrompt, { exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'New thread', exact: true }).click()
  await expect(composer).toHaveValue('Keep this unfinished draft')
  await olderThread.click()
  await page.reload()
  await expect(savedPrompt).toBeVisible()

  // The same sidebar becomes a native modal on mobile, and selection dismisses it.
  await page.setViewportSize({ width: 375, height: 640 })
  const historyTrigger = page.getByRole('button', {
    name: 'Thread history',
    exact: true,
  })
  await historyTrigger.click()
  const drawer = page.getByRole('dialog', { name: 'History' })
  await expect(drawer).toBeVisible()
  expect(await drawer.evaluate((element) => element.matches(':modal'))).toBe(
    true,
  )
  const drawerBounds = await drawer.boundingBox()
  expect(drawerBounds?.width).toBeLessThanOrEqual(319)
  await page.keyboard.press('Escape')
  await expect(drawer).toHaveCount(0)
  await expect(historyTrigger).toBeFocused()
  await historyTrigger.click()
  await olderThread.click()
  await expect(drawer).toHaveCount(0)
  await expect(savedPrompt).toBeVisible()
})

test('keeps the idle screen usable on a small viewport with reduced motion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 640 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signUpFreshAccount(page)

  await page
    .getByRole('button', { name: 'Thread history', exact: true })
    .click()
  await expect(
    page.getByText('Your conversations will appear here.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Close history', exact: true }).click()

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
