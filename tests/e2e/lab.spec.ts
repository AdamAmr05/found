import { expect, test } from '@playwright/test'

test('carries focus and the shortlist across representations', async ({
  page,
}) => {
  await page.goto('/lab')
  await expect(page.getByRole('tab', { name: /Fold/ })).toBeVisible()

  // The deck triages with buttons as well as gestures.
  await page.keyboard.press('3')
  await expect(
    page.getByText('Can I get through all six quickly?'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Shortlist', exact: true }).click()

  const tray = page.getByRole('complementary', { name: 'Shortlist' })
  await expect(tray.getByText('1 shortlisted')).toBeVisible()
  await expect(page.getByTestId('lab-focused')).toHaveText('Courtyard studio')

  // Switching representation keeps both the focus and the saved artifact.
  await page.keyboard.press('4')
  await expect(
    page.getByText('Who is actually inside my budget?'),
  ).toBeVisible()
  await expect(page.getByTestId('lab-focused')).toHaveText('Courtyard studio')
  await expect(tray.getByText('1 shortlisted')).toBeVisible()

  // The tray is a pill until it is asked for.
  await tray.getByRole('button', { name: /1 shortlisted/ }).click()
  await expect(tray.getByText('1 of 1 within your ceiling')).toBeVisible()
})

test('re-ranks candidates when a requirement becomes a must-have', async ({
  page,
}) => {
  await page.goto('/lab')
  await page.getByRole('tab', { name: /Ranked/ }).click()

  await expect(
    page.getByText('Mark a requirement as a must-have to rule candidates out.'),
  ).toBeVisible()

  const anmeldung = page
    .getByRole('listitem')
    .filter({ hasText: 'Anmeldung' })
    .first()
  await anmeldung.getByRole('button', { name: 'must' }).click()

  await expect(
    page.getByText('4 of 6 candidates clear your must-haves.'),
  ).toBeVisible()
  await expect(
    page.getByText('Ruled out · Anmeldung is a must-have').first(),
  ).toBeVisible()
})

test('rewinds the evidence to what was known earlier', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('tab', { name: /Freshness/ }).click()

  await expect(page.getByText('Everything known now')).toBeVisible()
  await expect(page.getByText('22 of 24 sources had been read')).toBeVisible()

  const handle = page.getByRole('button', { name: 'Rewind the evidence' })
  await handle.focus()
  for (let index = 0; index < 10; index += 1) {
    await page.keyboard.press('ArrowLeft')
  }

  // Every press must compose, rather than repeatedly stepping off the same value.
  await expect(page.getByText('22 of 24 sources had been read')).toHaveCount(0)
  await expect(page.getByText(/As of .* ago/)).toBeVisible()
})

test('holds one artifact that two messages both show', async ({ page }) => {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Conversation' }).click()

  const canalSide = page
    .locator('article')
    .filter({ hasText: 'Canal-side Altbau' })
  await expect(canalSide).toHaveCount(2)
  await expect(page.getByText('Listing body text only')).toHaveCount(0)

  // Changing resolution in one message changes it in the other: same object.
  await canalSide.first().getByRole('button', { name: 'Sources' }).click()
  await expect(page.getByText('Listing body text only')).toHaveCount(2)
})

test('edits the ceiling inside the sentence and re-evaluates everything', async ({
  page,
}) => {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Conversation' }).click()

  const ceiling = page.getByRole('button', { name: /Your monthly ceiling/ })
  await expect(page.getByText('4 of them fit and 2 do not')).toBeVisible()

  await ceiling.focus()
  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press('ArrowLeft')
  }

  await expect(
    page.getByRole('button', { name: /Your monthly ceiling, €1,190/ }),
  ).toBeVisible()
  await expect(page.getByText('1 of them fit and 5 do not')).toBeVisible()

  // The requirement is held above the views, so the representations agree.
  await page.getByRole('button', { name: 'Views' }).click()
  await expect(page.getByText('€54 over ceiling').first()).toBeVisible()
})

test('binds approval to the exact wording of the outreach draft', async ({
  page,
}) => {
  await page.goto('/lab')
  await page.getByRole('button', { name: 'Conversation' }).click()

  const draft = page.getByRole('region', {
    name: 'Open questions and the message that would ask them',
  })
  const approve = draft.getByRole('button', {
    name: 'Approve this exact message',
  })
  await expect(approve).toBeDisabled()

  await draft
    .getByRole('button', { name: /Anmeldung Canal-side Altbau/ })
    .click()
  await approve.click()
  await expect(draft.getByRole('button', { name: 'Send it' })).toBeVisible()

  // Editing the message must invalidate the approval it was given.
  await draft
    .getByRole('button', { name: /take .* back out of the message/i })
    .click()
  await expect(
    draft.getByRole('button', { name: 'Approve this exact message' }),
  ).toBeDisabled()
})

test('fits the lab on a small viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/lab')

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )

  expect(hasHorizontalOverflow).toBe(false)
})
