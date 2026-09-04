import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Hold only the external Convex connection; these tests never save data.
  await page.routeWebSocket(
    'wss://artifact-fixture.convex.cloud/**',
    (socket) => {
      socket.onMessage(() => {})
    },
  )
  await page.route('**/tests/fixtures/artifact-stream.html', (route) =>
    route.fulfill({
      path: 'tests/fixtures/artifact-stream.html',
      contentType: 'text/html',
    }),
  )
  await page.goto('/tests/fixtures/artifact-stream.html')
})

test('keeps candidate interaction state with its tool call when an earlier result arrives', async ({
  page,
}) => {
  const later = page
    .locator('article')
    .filter({
      has: page.getByRole('heading', { name: 'Later room', exact: true }),
    })
    .last()
  await later.getByRole('tab', { name: 'Evidence', exact: true }).click()
  await page.getByRole('button', { name: 'Finish earlier call' }).click()
  await expect(
    later.getByRole('tab', { name: 'Evidence', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  const earlier = page
    .locator('article')
    .filter({
      has: page.getByRole('heading', { name: 'Earlier room', exact: true }),
    })
    .last()
  await expect(
    earlier.getByRole('tab', { name: 'At a glance', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
})

test('keeps an open source dialog when preceding text and tools become visible', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Review source' }).click()
  const dialog = page.getByRole('dialog', { name: 'Open external link?' })
  await expect(dialog).toBeVisible()
  // A tool can finish while the modal makes the underlying document inert.
  await page
    .getByRole('button', { name: 'Finish earlier call' })
    .evaluate((button) => {
      if (!(button instanceof HTMLButtonElement)) {
        throw new Error('Expected the fixture completion button')
      }
      button.click()
    })
  await expect(
    page.getByRole('heading', {
      name: 'Earlier room',
      exact: true,
      includeHidden: true,
    }),
  ).toBeAttached()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Review source' }),
  ).toBeFocused()
})
