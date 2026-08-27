import { expect, test } from '@playwright/test'

test('presents the isolated ASCII material and its variants', async ({
  page,
}) => {
  await page.goto('/playground')
  await page.getByRole('link', { name: 'ASCII material' }).click()

  await expect(page).toHaveURL(/\/playground\/materials\/ascii$/)

  await expect(
    page.getByRole('heading', {
      name: 'Motion for search, focus, and activity.',
    }),
  ).toBeVisible()

  await expect(page.locator('[data-ascii-atmosphere]')).toHaveCount(5)
  await page.getByRole('button', { name: 'rich' }).click()
  await expect(page.getByRole('button', { name: 'rich' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  await expect(page.getByText('H1 · 60/64')).toBeVisible()
  await expect(page.getByText('H5 · 24/32')).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Flame' })).toBeVisible()
  await page.getByRole('button', { name: 'Gray' }).click()
  await expect(page.getByRole('button', { name: 'Gray' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
})

test('keeps the material lab within a small viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/playground/materials/ascii')

  await expect(
    page.getByRole('heading', {
      name: 'Motion for search, focus, and activity.',
    }),
  ).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )

  expect(hasHorizontalOverflow).toBe(false)
})
