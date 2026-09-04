import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/tests/fixtures/outreach-header.html', (route) =>
    route.fulfill({
      path: 'tests/fixtures/outreach-header.html',
      contentType: 'text/html',
    }),
  )
  await page.goto('/tests/fixtures/outreach-header.html')
})

test('preserves the change request and returns focus when closing', async ({
  page,
}) => {
  const edit = page.getByRole('button', {
    name: 'Ask for changes',
    exact: true,
  })
  const input = page.getByRole('textbox', { name: 'Ask for changes' })
  const send = page.getByRole('button', { name: 'Send', exact: true })
  const sendBounds = await send.boundingBox()
  await edit.click()
  await expect(input).toBeFocused()
  await input.fill('Make it shorter')
  await input.press('Escape')
  await expect(edit).toBeFocused()
  await expect(input).toHaveCount(0)
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('button', { name: 'Copy email body' }),
  ).toBeFocused()
  await edit.click()
  await expect(input).toHaveValue('Make it shorter')
  await input.press('Enter')
  await expect(page.getByRole('status')).toHaveText('Make it shorter')
  await expect(edit).toBeFocused()
  expect(await send.boundingBox()).toEqual(sendBounds)
})

test('keeps the field mounted during contraction and reverses an interrupted close', async ({
  page,
}) => {
  const edit = page.locator('.outreach-edit')
  const toggle = edit.getByRole('button', {
    name: 'Ask for changes',
    exact: true,
  })
  await toggle.click()
  await expect
    .poll(() =>
      edit.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBe(360)
  const input = page.getByRole('textbox', { name: 'Ask for changes' })
  await input.fill('A concise request')
  const closing = await edit.evaluate(async (element) => {
    const button = element.querySelector('button')
    const field = element.querySelector('input')
    if (!button || !field) throw new Error('Missing edit controls')
    button.click()
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
    const width = element.getBoundingClientRect().width
    const retained = element.querySelector('input') === field
    button.click()
    return { width, retained }
  })
  expect(closing.retained).toBe(true)
  expect(closing.width).toBeGreaterThan(82)
  await expect(input).toBeFocused()
  await expect(input).toHaveValue('A concise request')
  await expect
    .poll(() =>
      edit.evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBe(360)
})

for (const width of [320, 768]) {
  test(`keeps controls aligned at ${width}px with reduced motion`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 720 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const draft = page.getByRole('region', { name: 'Email draft' })
    const send = page.getByRole('button', { name: 'Send', exact: true })
    const before = await send.boundingBox()
    const measurements = await draft.evaluate((element) => {
      const header = element.querySelector('header')
      const edit = element.querySelector('.outreach-edit')
      const actions = element.querySelector('.outreach-header-actions')
      const send = actions?.lastElementChild
      if (!header || !edit || !send) throw new Error('Missing header controls')
      const shellRect = element.getBoundingClientRect()
      const editRect = edit.getBoundingClientRect()
      const sendRect = send.getBoundingClientRect()
      return {
        topInset: editRect.top - shellRect.top,
        leftInset: editRect.left - shellRect.left,
        rightInset: shellRect.right - sendRect.right,
        controlHeight: editRect.height,
        shellRadius: getComputedStyle(element).borderTopLeftRadius,
        editRadius: getComputedStyle(edit).borderTopLeftRadius,
        sendRadius: getComputedStyle(send).borderTopRightRadius,
        headerHeight: header.getBoundingClientRect().height,
      }
    })
    await testInfo.attach('header-measurements', {
      body: JSON.stringify(measurements, null, 2),
      contentType: 'application/json',
    })
    await page.screenshot({ path: testInfo.outputPath('header-closed.png') })
    await page
      .getByRole('button', { name: 'Ask for changes', exact: true })
      .click()
    await expect(
      page.getByRole('textbox', { name: 'Ask for changes' }),
    ).toBeFocused()
    const after = await send.boundingBox()
    if (width === 320) {
      expect(after?.x).toBe(before?.x)
      expect(after?.y).toBe((before?.y ?? 0) + 48)
      expect(
        await page
          .getByRole('textbox', { name: 'Ask for changes' })
          .evaluate((element) => element.clientWidth),
      ).toBeGreaterThan(160)
    } else {
      expect(after).toEqual(before)
    }
    expect(
      await draft.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true)
    await expect(send).toBeInViewport()
    await expect
      .poll(() =>
        page
          .getByRole('textbox', { name: 'Ask for changes' })
          .evaluate((element) => element.scrollLeft),
      )
      .toBe(0)
    await page.screenshot({ path: testInfo.outputPath('header-open.png') })
  })
}
