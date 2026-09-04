import { expect, test } from '@playwright/test'

const url = 'https://www.wg-gesucht.de/wg-zimmer-in-Ulm-Weststadt.14022135.html'

test.beforeEach(async ({ page }) => {
  // Serve a real renderer fixture without adding a product route or calling the model.
  await page.route('**/tests/fixtures/markdown.html', (route) =>
    route.fulfill({
      path: 'tests/fixtures/markdown.html',
      contentType: 'text/html',
    }),
  )
})

test('opens a contained link dialog and returns focus on dismissal', async ({
  page,
}) => {
  await page.goto('/tests/fixtures/markdown.html')
  const link = page.getByRole('button', {
    name: 'View listing and message the advertiser',
  })
  await link.click()
  const dialog = page.getByRole('dialog', { name: 'Open external link?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(url, { exact: true })).toBeVisible()
  const bounds = await dialog.boundingBox()
  expect(bounds?.width).toBeLessThanOrEqual(440)
  expect(bounds?.width).toBeGreaterThan(300)
  await expect(
    dialog.getByRole('button', { name: 'Close', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Copy link' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(
    dialog.getByRole('button', { name: 'Open link', exact: true }),
  ).toBeFocused()
  // The underlying document must remain inert while the native modal is open.
  await link.evaluate((element) => element.focus())
  await expect(
    dialog.getByRole('button', { name: 'Open link', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(link).toBeFocused()
  await link.click()
  await page.mouse.click(1, 1)
  await expect(dialog).toHaveCount(0)
  await expect(link).toBeFocused()
})

test('copies the destination and opens it in an isolated new tab', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/tests/fixtures/markdown.html')
  await page
    .getByRole('button', { name: 'View listing and message the advertiser' })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Copy link' }).click()
  await expect(dialog.getByRole('button', { name: 'Copied' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url)
  await context.route(url, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Listing</title>' }),
  )
  const newPage = context.waitForEvent('page')
  await dialog.getByRole('button', { name: 'Open link', exact: true }).click()
  const destination = await newPage
  await expect(destination).toHaveURL(url)
  expect(await destination.evaluate(() => window.opener === null)).toBe(true)
  await expect(dialog).toHaveCount(0)
})

test('fits a mobile viewport and handles unavailable clipboard access', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 640 })
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: () => Promise.reject(new Error('Clipboard unavailable')),
      },
    })
  })
  await page.goto('/tests/fixtures/markdown.html')
  await page
    .getByRole('button', { name: 'View listing and message the advertiser' })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const bounds = await dialog.boundingBox()
  expect(bounds?.x).toBeGreaterThanOrEqual(16)
  expect(bounds?.width).toBeLessThanOrEqual(343)
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true)
  await dialog.getByRole('button', { name: 'Copy link' }).click()
  await expect(dialog.getByRole('status')).toHaveText(
    'Couldn’t copy. You can select and copy the URL above.',
  )
  await expect(dialog.getByText(url, { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toHaveCount(0)
})
