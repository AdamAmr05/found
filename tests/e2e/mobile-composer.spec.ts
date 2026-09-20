import { expect, test } from '@playwright/test'

import { signUpFreshAccount } from './auth'

test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 390, height: 844 },
})

test('keeps touch entry readable and suppresses the idle beam paint layers', async ({
  page,
}) => {
  await signUpFreshAccount(page)

  const composer = page.getByRole('textbox', { name: 'Message Found' })
  const beam = page.locator('.thread-composer-beam')
  await expect(composer).toHaveCSS('font-size', '16px')
  // Exercise the untouched state, where desktop would run the effect.
  await expect(beam).toHaveAttribute('data-active', '')
  await expect(beam).toHaveCSS('animation-name', 'none')
  for (const pseudo of ['::before', '::after']) {
    expect(
      await beam.evaluate(
        (element, selector) => getComputedStyle(element, selector).display,
        pseudo,
      ),
    ).toBe('none')
  }
  await expect(beam.locator('[data-beam-bloom]')).toBeHidden()

  await composer.fill('A quiet place near transit')
  await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled()
  await composer.blur()
  await expect(composer).toHaveValue('A quiet place near transit')
  await expect(beam).toHaveCSS('animation-name', 'none')
})
