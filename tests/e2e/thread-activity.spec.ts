import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/tests/fixtures/thread-activity.html', (route) =>
    route.fulfill({
      path: 'tests/fixtures/thread-activity.html',
      contentType: 'text/html',
    }),
  )
  await page.goto('/tests/fixtures/thread-activity.html')
})

test('groups live steps and keeps one indicator through tools, thinking, and writing', async ({
  page,
}) => {
  const activity = page.locator('details')
  const indicator = page.getByRole('status')
  await expect(activity).toHaveCount(1)
  await expect(activity.getByRole('listitem')).toHaveCount(2)
  await expect(activity).toContainText('Searched the web × 4')
  await expect(activity).toContainText('Reading sources × 4')
  await expect(indicator).toHaveCount(1)
  await expect(indicator).toContainText('Reading sources')
  await expect(indicator.locator('canvas')).toBeVisible()
  const orb = await indicator.locator('canvas').getAttribute('data-orb-state')
  if (!orb) throw new Error('The active turn must have an orb animation')
  await page.getByRole('button', { name: 'Between steps', exact: true }).click()
  await expect(indicator).toContainText('Working')
  await expect(indicator.locator('canvas')).toHaveAttribute(
    'data-orb-state',
    orb,
  )
  await page.getByRole('button', { name: 'Writing', exact: true }).click()
  const answer = page.getByText(/I found a furnished room close/)
  await expect(answer).toBeVisible()
  await expect(indicator).toHaveCount(1)
  await expect(indicator.locator('canvas')).toHaveAttribute(
    'data-orb-state',
    orb,
  )
  const answerBounds = await answer.boundingBox()
  const indicatorBounds = await indicator.boundingBox()
  expect(indicatorBounds?.y).toBeGreaterThan(answerBounds?.y ?? 0)
  await expect(page.getByText(/could not be displayed/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Complete', exact: true }).click()
  await expect(indicator).toHaveCount(0)
  await expect(activity).not.toHaveAttribute('open')
  await expect(activity.locator('summary')).toContainText('Research activity')
  await activity.locator('summary').focus()
  await page.keyboard.press('Enter')
  await expect(activity).toHaveAttribute('open', '')
  await expect(activity).toContainText('Read sources × 4')
  await expect(
    activity.getByRole('link', { name: 'Ulm University — Google Maps' }),
  ).toHaveAttribute('href', 'https://maps.google.com/?q=Ulm+University')
  await page.getByRole('button', { name: 'Next turn', exact: true }).click()
  await expect(activity).toHaveCount(1)
  await expect(activity).not.toContainText('Reading sources')
  await expect(indicator).toHaveCount(1)
  await expect(indicator).toContainText('Thinking')
  await expect(indicator.locator('canvas')).not.toHaveAttribute(
    'data-orb-state',
    orb,
  )
})

test('retains partial answers on failure and stays usable with reduced motion on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 640 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByRole('status').locator('span')).toHaveCSS(
    'animation-name',
    'none',
  )
  await page.getByRole('button', { name: 'Failed', exact: true }).click()
  await expect(page.getByRole('status')).toHaveCount(0)
  await expect(page.getByText(/I found a furnished room close/)).toBeVisible()
  await expect(page.getByRole('alert')).toHaveText(
    'I couldn’t finish this response. Please try again.',
  )
  await page.locator('summary').click()
  await expect(page.locator('details')).toHaveAttribute('open', '')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
})
