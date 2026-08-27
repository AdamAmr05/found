import { expect, test } from '@playwright/test'

test('keeps the map and accommodation artifacts in sync', async ({ page }) => {
  await page.goto('/playground')

  await expect(
    page.getByRole('heading', {
      name: 'Two places are worth a closer look.',
    }),
  ).toBeVisible()

  await page
    .getByRole('button', {
      name: 'Select Courtyard studio, €1260 per month',
    })
    .click()

  await expect(page.getByTestId('focused-accommodation')).toHaveText(
    'Courtyard studio',
  )

  const firstArtifact = page.locator('article').first()
  await firstArtifact.getByRole('button', { name: 'Evidence' }).click()
  await expect(firstArtifact.getByText('7 sources connected')).toBeVisible()

  const comparisonButton = firstArtifact.getByRole('button', {
    name: 'Add to comparison',
  })
  const comparisonButtonBounds = await comparisonButton.boundingBox()
  const plusBounds = await comparisonButton.locator('svg').boundingBox()

  expect(comparisonButtonBounds?.width).toBe(44)
  expect(comparisonButtonBounds?.height).toBe(44)
  expect(plusBounds?.width).toBe(22)
  expect(plusBounds?.height).toBe(22)

  await comparisonButton.click()
  await expect(
    firstArtifact.getByRole('button', { name: 'Remove from comparison' }),
  ).toBeVisible()

  await firstArtifact.getByRole('button', { name: 'Decision' }).click()
  await expect(
    firstArtifact.getByRole('button', {
      name: 'Prepare questions for the landlord',
    }),
  ).toBeVisible()
})

test('fits the interaction study on a small viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/playground')

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )

  expect(hasHorizontalOverflow).toBe(false)
})
