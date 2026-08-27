import { expect, test } from '@playwright/test'

test('keeps the map and accommodation artifacts in sync', async ({ page }) => {
  await page.goto('/playground')

  await expect(
    page.getByRole('heading', {
      name: '2 places are worth a closer look.',
    }),
  ).toBeVisible()

  await page
    .getByRole('button', {
      name: 'Select Courtyard studio, €1328 all in per month',
    })
    .click()

  await expect(page.getByTestId('focused-accommodation')).toHaveText(
    'Courtyard studio',
  )

  const firstArtifact = page.locator('article').first()
  await firstArtifact.getByRole('button', { name: 'Evidence' }).click()
  await page.waitForTimeout(40)
  expect(
    await firstArtifact.evaluate(
      (element) => getComputedStyle(element).transform,
    ),
  ).toBe('none')
  await expect(firstArtifact.getByText('7 sources connected')).toBeVisible()

  const evidenceRows = await firstArtifact
    .getByTestId('evidence-row')
    .evaluateAll((elements) =>
      elements.map((element) => {
        const bounds = element.getBoundingClientRect()
        return { bottom: bounds.bottom, top: bounds.top }
      }),
    )
  evidenceRows.slice(1).forEach((row, index) => {
    expect(row.top).toBeGreaterThanOrEqual(evidenceRows[index]?.bottom ?? 0)
  })

  const comparisonButton = firstArtifact.getByRole('button', {
    name: 'Add to comparison',
  })
  const comparisonButtonBounds = await comparisonButton.boundingBox()
  const plusBounds = await comparisonButton.locator('svg').boundingBox()

  expect(comparisonButtonBounds?.width).toBeCloseTo(44, 2)
  expect(comparisonButtonBounds?.height).toBeCloseTo(44, 2)
  expect(plusBounds?.width).toBeCloseTo(22, 2)
  expect(plusBounds?.height).toBeCloseTo(22, 2)

  await comparisonButton.click()
  await expect(
    firstArtifact.getByRole('button', { name: 'Remove from comparison' }),
  ).toBeVisible()
  await expect(
    page.getByRole('complementary', { name: 'Shortlist' }),
  ).toContainText('1 shortlisted')

  await firstArtifact.getByRole('button', { name: 'Decision' }).click()
  await expect(
    firstArtifact.getByRole('button', {
      name: 'Prepare questions for the landlord',
    }),
  ).toBeVisible()
})

test('retargets card details without moving its controls or stacking text', async ({
  page,
}) => {
  await page.goto('/playground')
  const card = page.locator('article').first()

  await card.getByRole('button', { name: 'Evidence' }).click()
  await card.getByRole('button', { name: 'Decision' }).click()
  await card.getByRole('button', { name: 'At a glance' }).click()
  await card.getByRole('button', { name: 'Evidence' }).click()

  await expect(card.getByText('7 sources connected')).toBeVisible()
  await expect(card.getByRole('button', { name: 'Evidence' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect(
    await card.evaluate((element) => getComputedStyle(element).transform),
  ).toBe('none')
})

test('changes representation as results arrive and compares the same artifacts', async ({
  page,
}) => {
  await page.goto('/playground')

  await page.getByRole('button', { name: '3', exact: true }).click()
  await page.waitForTimeout(40)

  const canalFold = page.getByTestId('fold-row-maybachufer')
  await expect(canalFold).toBeVisible()
  const foldTransform = await canalFold.evaluate(
    (element) => getComputedStyle(element).transform,
  )
  expect(foldTransform).toBe('none')
  await expect(canalFold.getByText('€1,244', { exact: true })).toBeVisible()
  await expect(page.getByTestId('fold-row-boxhagener')).toBeVisible()

  await page.getByRole('button', { name: 'Compare', exact: true }).click()
  await expect(
    page.getByRole('region', {
      name: 'Canal-side Altbau compared with Courtyard studio',
    }),
  ).toBeVisible()
  await expect(page.getByText('Operator PDF · 3 pages agree')).toBeVisible()

  await page.getByRole('button', { name: '2', exact: true }).click()
  await expect(page.getByTestId('fold-row-maybachufer')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Canal-side Altbau' }),
  ).toBeVisible()
  await expect(page.getByText('€1,244').first()).toBeVisible()
})

test('fits the interaction study on a small viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/playground')

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )

  expect(hasHorizontalOverflow).toBe(false)
})
