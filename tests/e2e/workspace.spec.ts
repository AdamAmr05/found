import { expect, test } from '@playwright/test'

import { signUpFreshAccount } from './auth'

test('keeps the workspace steady and preserves drafts across app routes', async ({
  page,
}, testInfo) => {
  await signUpFreshAccount(page)
  const composer = page.getByRole('textbox', { name: 'Message Found' })
  await composer.fill('Keep this draft while I check my inbox')
  const wordmark = page.getByRole('link', { name: 'found', exact: true })
  const wordmarkBounds = await wordmark.boundingBox()
  const historyTrigger = page.getByRole('button', {
    name: 'Thread history',
    exact: true,
  })
  await historyTrigger.click()
  const history = page.getByRole('navigation', { name: 'Conversations' })
  await expect(history).toBeVisible()
  await expect
    .poll(async () => (await page.getByRole('main').boundingBox())?.x)
    .toBe(248)

  await page.getByRole('link', { name: 'Inbox', exact: true }).click()
  await expect(page).toHaveURL(/\/inbox$/)
  await expect(
    page.getByRole('heading', { name: 'Inbox', exact: true }),
  ).toBeVisible()
  await expect(history).toBeVisible()
  expect(await wordmark.boundingBox()).toEqual(wordmarkBounds)
  const inboxBounds = await page
    .getByRole('main')
    .locator('section')
    .boundingBox()
  await page.getByRole('link', { name: 'Bookmarks', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Bookmarks', exact: true }),
  ).toBeVisible()
  expect(await wordmark.boundingBox()).toEqual(wordmarkBounds)
  const bookmarksBounds = await page
    .getByRole('main')
    .locator('section')
    .boundingBox()
  expect(bookmarksBounds?.x).toBe(inboxBounds?.x)
  expect(bookmarksBounds?.width).toBe(inboxBounds?.width)
  await expect(history).toBeVisible()
  await expect(
    page.getByText('Nothing saved yet', { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Bookmarks', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await page.screenshot({ path: testInfo.outputPath('workspace-desktop.png') })

  await page.goBack()
  await expect(
    page.getByRole('heading', { name: 'Inbox', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Chat', exact: true }).click()
  await expect(composer).toHaveValue('Keep this draft while I check my inbox')
  await page.getByRole('link', { name: 'Bookmarks', exact: true }).click()
  await page.getByRole('button', { name: 'New thread', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(composer).toHaveValue('Keep this draft while I check my inbox')
  await expect(page.getByRole('link', { name: 'Playground' })).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'Lab', exact: true }),
  ).toHaveCount(0)
})

test('provides mobile navigation and history from collection pages', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signUpFreshAccount(page)
  for (const destination of ['Inbox', 'Bookmarks', 'Chat']) {
    const link = page.getByRole('link', { name: destination, exact: true })
    await expect(link).toBeInViewport()
    await link.click()
    const header = page.getByRole('banner')
    expect(
      await header.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true)
    await expect(
      page.getByRole('button', { name: 'New thread', exact: true }),
    ).toBeInViewport()
    const trigger = page.getByRole('button', {
      name: 'Thread history',
      exact: true,
    })
    await trigger.click()
    const drawer = page.getByRole('dialog', { name: 'History' })
    await expect(drawer).toBeVisible()
    expect(await drawer.evaluate((element) => element.matches(':modal'))).toBe(
      true,
    )
    await page.keyboard.press('Escape')
    await expect(drawer).toHaveCount(0)
    await expect(trigger).toBeFocused()
  }
  await page.getByRole('link', { name: 'Inbox', exact: true }).click()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Inbox', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('No outreach yet', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeInViewport()
  await page.screenshot({ path: testInfo.outputPath('workspace-mobile.png') })
  await page.getByRole('button', { name: 'New thread', exact: true }).click()
  await expect(
    page.getByRole('textbox', { name: 'Message Found' }),
  ).toBeVisible()
})
