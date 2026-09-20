import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Serve the row fixture without a product route or a signed-in session.
  await page.route('**/tests/fixtures/inbox-list.html', (route) =>
    route.fulfill({
      path: 'tests/fixtures/inbox-list.html',
      contentType: 'text/html',
    }),
  )
  await page.goto('/tests/fixtures/inbox-list.html')
})

test('separates place, subject, and address into distinct tiers', async ({
  page,
}) => {
  const replied = page.getByRole('button', {
    name: /Open outreach to Studierendenwerk Ulm — apartment category/,
  })
  await expect(replied).toContainText('Replied')
  await expect(replied.getByLabel('1 unread replies')).toBeVisible()
  const title = replied.locator('.text-label-large')
  const subject = replied.locator('.text-body-medium')
  const meta = replied.locator('time')
  const [titleSize, subjectSize, metaFamily] = await Promise.all([
    title.evaluate((el) => getComputedStyle(el).fontSize),
    subject.evaluate((el) => getComputedStyle(el).fontSize),
    meta.evaluate((el) => getComputedStyle(el).fontFamily),
  ])
  expect(Number.parseFloat(titleSize)).toBeGreaterThan(
    Number.parseFloat(subjectSize),
  )
  expect(metaFamily.toLowerCase()).toContain('mono')

  const draft = page.getByRole('button', {
    name: /Open outreach to Studierendenwerk Ulm — €343/,
  })
  await expect(draft).toBeDisabled()
  await expect(draft).not.toContainText('No recipient')

  await expect(
    page.getByRole('button', { name: /Gutenbergstraße 6/ }),
  ).toContainText('Failed')

  await replied.click()
  await expect(page.getByRole('status')).toHaveText(
    'Studierendenwerk Ulm — apartment category (residence to confirm)',
  )
})

test('filters rows by delivery state', async ({ page }) => {
  const group = page.getByRole('group', { name: 'Filter by state' })
  await expect(group.getByRole('button', { name: 'All' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await group.getByRole('button', { name: 'Replied' }).click()
  const rows = page.getByRole('button', { name: /Open outreach to/ })
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('Replied')
  await group.getByRole('button', { name: 'Drafts' }).click()
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('€343 apartment lead')
  await group.getByRole('button', { name: 'All' }).click()
  await expect(rows).toHaveCount(4)
})

test('keeps long inbox rows and their metadata inside phone widths', async ({
  page,
}) => {
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width)
    for (const row of await page
      .getByRole('button', { name: /Open outreach to/ })
      .all()) {
      const bounds = await row.boundingBox()
      expect(bounds).not.toBeNull()
      if (!bounds) throw new Error('Inbox row is not laid out')
      expect(bounds.x).toBeGreaterThanOrEqual(20)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width - 20)
      await expect(row.locator('time')).toBeVisible()
      expect(
        await row.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true)
    }
  }
})
