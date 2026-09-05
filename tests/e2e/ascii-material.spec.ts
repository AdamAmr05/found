import { expect, test } from '@playwright/test'

test('keeps ASCII resolution independent of an expansion transform', async ({
  page,
}) => {
  await page.goto('/playground/materials/ascii')
  const field = page.locator('[data-ascii-atmosphere]').first()
  await expect(field).toBeVisible()

  // Resize while projected at thumbnail scale, then finish the transform.
  // Transform completion alone does not notify ResizeObserver.
  await field.evaluate((element) => {
    element.style.transform = 'scale(0.08, 0.2)'
    element.style.width = '600px'
    element.style.height = '196px'
  })
  await expect
    .poll(() =>
      field.locator('canvas').evaluate((canvas: HTMLCanvasElement) => ({
        width: canvas.width,
        height: canvas.height,
        expectedWidth: Math.round(600 * Math.min(devicePixelRatio, 1.75)),
        expectedHeight: Math.round(196 * Math.min(devicePixelRatio, 1.75)),
      })),
    )
    .toMatchObject({
      width: 600,
      height: 196,
      expectedWidth: 600,
      expectedHeight: 196,
    })

  await field.evaluate((element) => {
    element.style.transform = 'none'
  })
  await expect(field.locator('canvas')).toHaveAttribute('width', '600')
})

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
