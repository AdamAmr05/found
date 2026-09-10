import { describe, expect, test } from 'vitest'

import {
  emailBodyToPlainText,
  emailHtmlToPlainText,
  normalizeEmailText,
} from './outreachMailText'

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

describe('normalizeEmailText', () => {
  test('collapses Outlook link pairs and blank non-breaking paragraphs', () => {
    const outlook = [
      'Private room offers can be found on our website:',
      '',
      '\u00a0',
      '',
      ' <https://studierendenwerk-ulm.de/wp-content/uploads/PZV_ulm.pdf> https://studierendenwerk-ulm.de/wp-content/uploads/PZV_ulm.pdf.',
      '',
      ' <mailto:dragana.bass@studierendenwerk-ulm.de> dragana.bass@studierendenwerk-ulm.de',
      '',
      ' <https://studierendenwerk-ulm.de/> www.studierendenwerk-ulm.de ',
      '',
      ' <https://studierendenwerk-ulm.de/apply> Apply here',
      '',
      ' <https://studierendenwerk-ulm.de/bare>',
    ].join('\n')

    expect(normalizeEmailText(outlook)).toBe(
      [
        'Private room offers can be found on our website:',
        '',
        'https://studierendenwerk-ulm.de/wp-content/uploads/PZV_ulm.pdf.',
        '',
        'dragana.bass@studierendenwerk-ulm.de',
        '',
        'https://studierendenwerk-ulm.de/',
        '',
        'https://studierendenwerk-ulm.de/apply Apply here',
        '',
        'https://studierendenwerk-ulm.de/bare',
      ].join('\n'),
    )
  })

  test('applies to every body source', () => {
    expect(
      emailBodyToPlainText({
        text: 'See <https://example.com/list> https://example.com/list\r\n\r\n\r\nThanks',
      }),
    ).toBe('See https://example.com/list\n\nThanks')
  })
})
