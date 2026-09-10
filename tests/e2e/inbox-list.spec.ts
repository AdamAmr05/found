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
