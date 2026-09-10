import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'

import { signUpFreshAccount } from './auth'

// A checked-in speech fixture exercises real capture, upload, and provider
// transcription. Noise or a provider failure must never count as success.
const speechFixture = fileURLToPath(
  new URL('../fixtures/audio/quiet-apartment.wav', import.meta.url),
)

test.use({
  permissions: ['microphone'],
  launchOptions: {
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      `--use-file-for-fake-audio-capture=${speechFixture}`,
    ],
  },
})

test('records a voice note into the draft without losing typed text', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  await signUpFreshAccount(page)

  const composer = page.getByRole('textbox', { name: 'Message Found' })
  const send = page.getByRole('button', { name: 'Send message' })
  const start = page.getByRole('button', { name: 'Start voice transcription' })
  await composer.fill('Somewhere in Lisbon')
  await expect(start).toBeVisible()
  await start.click()

  // Recording replaces the draft with the live meter and timer; the same
  // control becomes Stop and the send button offers to transcribe and send.
  const stop = page.getByRole('button', { name: 'Stop voice recording' })
  await expect(stop).toBeVisible()
  await expect(stop).toHaveAttribute('aria-pressed', 'true')
  await expect(composer).toHaveCount(0)
  await expect(page.getByText('Voice recording in progress')).toBeAttached()
  await expect(
    page.getByRole('button', { name: 'Transcribe and send' }),
  ).toBeEnabled()
  await expect(page.getByText(/^0:0[1-9]$/)).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('voice-recording.png') })

  // Discard drops the capture without a transcription round trip and hands
  // the untouched draft back.
  await page.getByRole('button', { name: 'Discard voice recording' }).click()
  await expect(composer).toHaveValue('Somewhere in Lisbon')
  await expect(composer).toBeEditable()
  await expect(start).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)

  await start.click()
  await expect(stop).toBeVisible()
  // The fixture loops. Eight seconds captures a complete sentence even when
  // capture resumes partway through it after the discarded recording.
  await expect(page.getByText(/^0:0[8-9]$/)).toBeVisible({ timeout: 12_000 })
  await stop.click()

  await expect(
    page.getByRole('button', { name: 'Transcribing voice recording' }),
  ).toBeDisabled()
  await expect(composer).toHaveAttribute('readonly', '')

  // Accept punctuation/case differences, but require recognizable speech
  // appended after the original draft. An unchanged draft or error fails.
  await expect(composer).toHaveValue(
    /^Somewhere in Lisbon .*quiet apartment near the river/is,
    { timeout: 70_000 },
  )
  await expect(start).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(composer).toBeEditable()
  await expect(send).toBeEnabled()
  await page.screenshot({ path: testInfo.outputPath('voice-finished.png') })
})
