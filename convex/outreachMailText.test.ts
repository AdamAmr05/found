import { describe, expect, test } from 'vitest'

import { emailBodyToPlainText, emailHtmlToPlainText } from './outreachMailText'

describe('emailHtmlToPlainText', () => {
  test('recovers the visible body from an HTML-only iPhone reply', () => {
    const html = `<html class="apple-mail-supports-explicit-dark-mode"><head><meta content="text/html; charset=utf-8" /></head><body><div><meta content="text/html; charset=utf-8" />Hello hello codex, does this work?<br /><div>Sent from my iPhone</div><div><br />`

    expect(emailHtmlToPlainText(html)).toBe(
      'Hello hello codex, does this work?\nSent from my iPhone',
    )
  })

  test('uses a complete HTML body instead of its shortened preview', () => {
    expect(
      emailBodyToPlainText({
        extractedText: '',
        preview: 'The complete reply starts here…',
        html: '<p>The complete reply starts here and includes the answer.</p>',
      }),
    ).toBe('The complete reply starts here and includes the answer.')
  })
})
