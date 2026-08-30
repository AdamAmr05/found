const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeOutreachRecipient(recipient: string): string {
  return recipient.trim().toLowerCase()
}

export function normalizeOutreachSubject(subject: string): string {
  return subject.trim()
}

export function validateOutreachContent(args: {
  recipient: string
  subject: string
  body: string
}): void {
  if (!EMAIL_PATTERN.test(args.recipient)) {
    throw new Error('A valid recipient email address is required.')
  }
  if (args.subject.length === 0) {
    throw new Error('A subject is required.')
  }
  if (args.body.trim().length === 0) {
    throw new Error('The email body cannot be empty.')
  }
}

export async function outreachContentHash(args: {
  inboxId: string
  recipient: string
  subject: string
  body: string
}): Promise<string> {
  const canonical = JSON.stringify({
    from: args.inboxId,
    to: [args.recipient],
    subject: args.subject,
    text: args.body,
  })
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
