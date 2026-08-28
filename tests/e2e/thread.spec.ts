import { expect, test } from '@playwright/test'

test('starts from a focused accommodation conversation', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: 'Where do you need to live?' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Playground' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Lab' })).toBeVisible()

  const composer = page.getByRole('textbox', { name: 'Message Found' })
  const send = page.getByRole('button', { name: 'Send message' })
  await expect(send).toBeDisabled()

  await composer.fill('I need a place in Berlin')
  await expect(send).toBeEnabled()
  await composer.press('Shift+Enter')
  await composer.type('from October.')
  await expect(composer).toHaveValue('I need a place in Berlin\nfrom October.')

  await composer.press('Enter')
  const savedPrompt = page.getByText(
    'I need a place in Berlin\nfrom October.',
    { exact: true },
  )
  await expect(savedPrompt).toBeVisible()

  await page.reload()
  await expect(savedPrompt).toBeVisible()
  await expect(page.getByRole('button', { name: 'New thread' })).toBeVisible()
})
