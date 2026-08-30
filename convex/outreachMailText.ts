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
