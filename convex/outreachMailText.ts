const HTML_BLOCK_BOUNDARY =
  /<(?:br\s*\/?|\/(?:blockquote|div|h[1-6]|li|p|pre|tr))\s*>/giu
const HTML_LIST_ITEM = /<li(?:\s[^>]*)?>/giu
const HTML_SCRIPT_OR_STYLE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/giu
const HTML_TAG = /<[^>]+>/gu
const HTML_ENTITY = /&(amp|apos|gt|lt|nbsp|quot);/gu

const ENTITY_VALUE = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
} as const

// Outlook writes each hyperlink in the plain-text part as `<target> label`.
const OUTLOOK_LINK_PAIR =
  /<((?:https?:\/\/|mailto:)[^\s<>]+)>[ \t]*([^\s<>]+)?/giu
const LABEL_TRAILING_PUNCTUATION = /[.,;:!?)]+$/u

type EmailBodyParts = {
  extractedText?: string | undefined
  text?: string | undefined
  extractedHtml?: string | undefined
  html?: string | undefined
  preview?: string | undefined
}

function firstNonEmpty(...values: readonly (string | undefined)[]): string {
  return values.find((value) => value?.trim()) ?? ''
}

export function emailHtmlToPlainText(html: string): string {
  return html
    .replace(HTML_SCRIPT_OR_STYLE, '')
    .replace(HTML_BLOCK_BOUNDARY, '\n')
    .replace(HTML_LIST_ITEM, '• ')
    .replace(HTML_TAG, '')
    .replace(
      HTML_ENTITY,
      (_entity, name: keyof typeof ENTITY_VALUE) => ENTITY_VALUE[name],
    )
    .replace(/\r/gu, '')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n[ \t]+/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

function comparableLink(value: string): string {
  return value
    .toLowerCase()
    .replace(/^mailto:/u, '')
    .replace(/^https?:\/\//u, '')
    .replace(/^www\./u, '')
    .replace(/\/$/u, '')
}

/**
 * Collapse Outlook's `<target> label` pair into one link. A label that names
 * the same address keeps only the full target so it can be linked; any other
 * label stays in place after the bare target.
 */
function collapseOutlookLink(
  _match: string,
  target: string,
  label: string | undefined,
): string {
  const address = target.replace(/^mailto:/iu, '')
  if (!label) return address
  const punctuation = LABEL_TRAILING_PUNCTUATION.exec(label)?.[0] ?? ''
  const bareLabel = label.slice(0, label.length - punctuation.length)
  if (comparableLink(bareLabel) === comparableLink(target)) {
    return `${address}${punctuation}`
  }
  return `${address} ${label}`
}

export function normalizeEmailText(text: string): string {
  return text
    .replace(/\u00a0/gu, ' ')
    .replace(OUTLOOK_LINK_PAIR, collapseOutlookLink)
    .replace(/\r/gu, '')
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n[ \t]+/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

export function emailBodyToPlainText(parts: EmailBodyParts): string {
  const html = firstNonEmpty(parts.extractedHtml, parts.html)
  return normalizeEmailText(
    firstNonEmpty(
      parts.extractedText,
      parts.text,
      html ? emailHtmlToPlainText(html) : undefined,
      parts.preview,
    ),
  )
}
