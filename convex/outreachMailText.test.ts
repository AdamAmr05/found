import { describe, expect, test } from 'vitest'

import { emailHtmlToPlainText } from './outreachMailText'

describe('emailHtmlToPlainText', () => {
  test('recovers the visible body from an HTML-only iPhone reply', () => {
    const html = `<html class="apple-mail-supports-explicit-dark-mode"><head><meta content="text/html; charset=utf-8" /></head><body><div><meta content="text/html; charset=utf-8" />Hello hello codex, does this work?<br /><div>Sent from my iPhone</div><div><br />`

    expect(emailHtmlToPlainText(html)).toBe(
      'Hello hello codex, does this work?\nSent from my iPhone',
    )
  })
})
