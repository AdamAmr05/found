import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/tests/fixtures/thread-history.html*', (route) =>
    route.fulfill({
      path: 'tests/fixtures/thread-history.html',
      contentType: 'text/html',
    }),
  )
  await page.goto('/tests/fixtures/thread-history.html')
})

for (const mobile of [false, true]) {
  test(`older pages remain reachable and preserve the reading position (${mobile ? 'mobile' : 'desktop'})`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 375, height: 640 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const articles = page.locator('[data-message-key]')
    await expect(articles).toHaveCount(40)
    await expect(articles.last()).toBeInViewport()
    await page
      .locator('[role="log"] > div')
      .first()
      .evaluate((element) => {
        element.scrollTop = 0
      })
    const loading = page.getByRole('button', {
      name: 'Loading older messages…',
    })
    await expect(loading).toBeDisabled()
    const before = await page
      .locator('[data-message-key="message-80"]')
      .boundingBox()
    await expect(articles).toHaveCount(80)
    const after = await page
      .locator('[data-message-key="message-80"]')
      .boundingBox()
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(3)
    await expect(page.locator('[data-message-key="message-119"]')).toHaveCount(
      1,
    )

    // Keyboard users can explicitly request another page without scrolling to the edge.
    const load = page.getByRole('button', {
      name: 'Load older messages',
      exact: true,
    })
    await load.evaluate((element) => element.focus({ preventScroll: true }))
    await page.keyboard.press('Enter')
    await expect(loading).toBeDisabled()
    await expect(articles).toHaveCount(120)
    await expect(load).toHaveCount(0)
    await articles.first().scrollIntoViewIfNeeded()
    await expect(articles.first()).toContainText('Saved message 0.')
    await page.getByRole('button', { name: 'Jump to latest message' }).click()
    await expect(articles.last()).toBeInViewport()
    await page.getByRole('button', { name: 'Switch thread' }).click()
    await expect(articles).toHaveCount(40)
    await expect(articles.last()).toBeInViewport()
  })
}

test('cached pages can be loaded repeatedly without an intermediate loading render', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/thread-history.html?cached')
  const articles = page.locator('[data-message-key]')
  await expect(articles).toHaveCount(40)
  await expect(articles.last()).toBeInViewport()
  const load = page.getByRole('button', {
    name: 'Load older messages',
    exact: true,
  })
  for (const count of [80, 120]) {
    await load.evaluate((element) => element.focus({ preventScroll: true }))
    await page.keyboard.press('Enter')
    await expect(articles).toHaveCount(count)
  }
  await expect(load).toHaveCount(0)
})

test('keeps the viewport stable when history arrives while loading is still active', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/thread-history.html?staged')
  const articles = page.locator('[data-message-key]')
  const viewport = page.locator('[role="log"] > div').first()
  const anchor = page.locator('[data-message-key="message-80"]')
  await expect(articles.last()).toBeInViewport()
  await viewport.evaluate((element) => {
    element.scrollTop = 0
  })
  await expect(
    page.getByRole('button', { name: 'Loading older messages…' }),
  ).toBeDisabled()
  const before = await anchor.boundingBox()
  await viewport.hover()
  await page.mouse.wheel(0, -400)
  await page.mouse.wheel(0, -400)
  await page.getByRole('button', { name: 'Deliver older page' }).click()
  await expect(articles).toHaveCount(80)
  await expect
    .poll(async () => (await anchor.boundingBox())?.y)
    .toBeCloseTo(before?.y ?? 0, 0)
  // Keep scrolling while the request is still pending. Its eventual completion
  // must preserve this new reading position, not replay accumulated movement.
  await viewport.hover()
  await page.mouse.wheel(0, -180)
  await expect
    .poll(async () => (await anchor.boundingBox())?.y)
    .toBeGreaterThan((before?.y ?? 0) + 100)
  const scrolled = await anchor.boundingBox()
  await page.getByRole('button', { name: 'Finish loading' }).click()
  await expect(
    page.getByRole('button', { name: 'Load older messages', exact: true }),
  ).toBeEnabled()
  await expect
    .poll(async () => (await anchor.boundingBox())?.y)
    .toBeCloseTo(scrolled?.y ?? 0, 0)
})
