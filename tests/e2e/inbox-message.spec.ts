import { expect, test } from '@playwright/test'

const pdfUrl =
  'https://studierendenwerk-ulm.de/wp-content/uploads/privatzimmer/PZV_ulm.pdf'

test.beforeEach(async ({ page }) => {
  // Serve the renderer fixture without a product route or a signed-in session.
  await page.route('**/tests/fixtures/inbox-message.html', (route) =>
    route.fulfill({
      path: 'tests/fixtures/inbox-message.html',
      contentType: 'text/html',
    }),
  )
  await page.goto('/tests/fixtures/inbox-message.html')
})

test('renders Outlook link pairs as single links behind the external dialog', async ({
  page,
}) => {
  const body = page.locator('article')
  await expect(body).not.toContainText('<https://')
  await expect(body).not.toContainText('<mailto:')
  await expect(body).not.toContainText('www.studierendenwerk-ulm.de')

  const pdfLink = page.getByRole('link', { name: pdfUrl })
  await expect(pdfLink).toHaveAttribute('href', pdfUrl)
  await pdfLink.click()
  const dialog = page.getByRole('dialog', { name: 'Open external link?' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText(pdfUrl, { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(pdfLink).toBeFocused()

  await expect(
    page.getByRole('link', { name: 'dragana.bass@studierendenwerk-ulm.de' }),
  ).toHaveAttribute('href', 'mailto:dragana.bass@studierendenwerk-ulm.de')
  await expect(
    page.getByRole('link', {
      name: 'https://studierendenwerk-ulm.de/',
      exact: true,
    }),
  ).toHaveCount(1)
})

test('lists attachments with their transfer state', async ({ page }) => {
  const list = page.getByRole('list', { name: 'Attachments' })
  const items = list.getByRole('listitem')
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toContainText('Zimmersuche_2024-1.pdf')
  await expect(items.nth(0)).toContainText('1.2 MB')
  await expect(
    items.nth(0).getByRole('link', { name: /Zimmersuche_2024-1\.pdf/ }),
  ).toHaveAttribute('href', 'https://example.test/files/Zimmersuche_2024-1.pdf')
  await expect(items.nth(1)).toContainText('image001.jpg')
  await expect(items.nth(1)).toContainText('inline')
  await expect(items.nth(1)).toContainText('saving')
  await expect(items.nth(2)).toContainText('not saved')
  await page
    .getByRole('button', { name: 'Retry saving Mietvertrag.docx' })
    .click()
  await expect(page.getByRole('status')).toHaveText('failed')
})
