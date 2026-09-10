import { useState } from 'react'

import { threadLinkSafety } from '../thread/ExternalLinkDialog'

// Email bodies arrive as plain text and stay plain text: they are untrusted,
// and Markdown would misread underscores, hashes, and bare asterisks that
// real mail contains. Only web addresses and email addresses become links.
const LINK_PATTERN =
  /(https?:\/\/[^\s<>()]+|www\.[^\s<>()]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+)/giu
const TRAILING_PUNCTUATION = /[.,;:!?]+$/u

type BodyPart =
  | { kind: 'text'; text: string }
  | { kind: 'web'; text: string; href: string }
  | { kind: 'mail'; text: string; href: string }

function linkPart(token: string): BodyPart {
  if (token.includes('@') && !token.includes('/')) {
    return { kind: 'mail', text: token, href: `mailto:${token}` }
  }
  return {
    kind: 'web',
    text: token,
    href: token.toLowerCase().startsWith('www.') ? `https://${token}` : token,
  }
}

function mailBodyParts(text: string): BodyPart[] {
  const parts: BodyPart[] = []
  let cursor = 0
  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index
    if (start > cursor) {
      parts.push({ kind: 'text', text: text.slice(cursor, start) })
    }
    const raw = match[0]
    const punctuation = TRAILING_PUNCTUATION.exec(raw)?.[0] ?? ''
    const token = raw.slice(0, raw.length - punctuation.length)
    parts.push(linkPart(token))
    if (punctuation) parts.push({ kind: 'text', text: punctuation })
    cursor = start + raw.length
  }
  if (cursor < text.length) {
    parts.push({ kind: 'text', text: text.slice(cursor) })
  }
  return parts
}

const linkClassName =
  'text-heat-100 underline underline-offset-3 [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100'

export function MailBody({ text }: { readonly text: string }) {
  const [pendingUrl, setPendingUrl] = useState<string>()

  function openPending(): void {
    if (pendingUrl) window.open(pendingUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <p className="mt-12 text-body-large whitespace-pre-wrap">
        {mailBodyParts(text).map((part, index) =>
          part.kind === 'text' ? (
            <span key={index}>{part.text}</span>
          ) : part.kind === 'mail' ? (
            <a key={index} className={linkClassName} href={part.href}>
              {part.text}
            </a>
          ) : (
            <a
              key={index}
              className={linkClassName}
              href={part.href}
              rel="noreferrer"
              target="_blank"
              onClick={(event) => {
                event.preventDefault()
                setPendingUrl(part.href)
              }}
            >
              {part.text}
            </a>
          ),
        )}
      </p>
      {pendingUrl
        ? threadLinkSafety.renderModal?.({
            url: pendingUrl,
            isOpen: true,
            onClose: () => setPendingUrl(undefined),
            onConfirm: openPending,
          })
        : null}
    </>
  )
}
