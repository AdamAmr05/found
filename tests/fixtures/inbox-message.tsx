import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

import type { Id } from '../../convex/_generated/dataModel'
import { normalizeEmailText } from '../../convex/outreachMailText'
import { MailBody } from '../../src/features/outreach/MailBody'
import { MessageAttachments } from '../../src/features/outreach/MessageAttachments'
import '../../src/styles/app.css'

// The plain-text part Outlook produced for a real reply, before normalization.
const outlookText = [
  'Guten Tag Herr Amr,',
  '',
  ' ',
  '',
  'Private room offers, which we update daily, can be found on our website:',
  '',
  ' <https://studierendenwerk-ulm.de/wp-content/uploads/privatzimmer/PZV_ulm.pdf> https://studierendenwerk-ulm.de/wp-content/uploads/privatzimmer/PZV_ulm.pdf',
  '',
  'Freundliche Grüße',
  'Dragana Bass',
  '',
  ' <mailto:dragana.bass@studierendenwerk-ulm.de> dragana.bass@studierendenwerk-ulm.de',
  '',
  ' <https://studierendenwerk-ulm.de/> www.studierendenwerk-ulm.de',
].join('\n')

function attachmentId(value: string): Id<'outreachAttachments'> {
  // SAFETY: Fixture rows never reach a database; the id only keys the list.
  return value as Id<'outreachAttachments'>
}

const attachments = [
  {
    id: attachmentId('stored'),
    messageId: 'reply',
    attachmentId: 'att-pdf',
    filename: 'Zimmersuche_2024-1.pdf',
    contentType: 'application/pdf',
    size: 1_262_000,
    disposition: 'attachment' as const,
    status: 'stored' as const,
    url: 'https://example.test/files/Zimmersuche_2024-1.pdf',
  },
  {
    id: attachmentId('inline'),
    messageId: 'reply',
    attachmentId: 'att-image',
    filename: 'image001.jpg',
    contentType: 'image/jpeg',
    size: 1408,
    disposition: 'inline' as const,
    status: 'pending' as const,
    url: null,
  },
  {
    id: attachmentId('failed'),
    messageId: 'reply',
    attachmentId: 'att-doc',
    filename: 'Mietvertrag.docx',
    contentType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 48_120,
    disposition: 'attachment' as const,
    status: 'failed' as const,
    url: null,
  },
]

function InboxMessageFixture() {
  const [retried, setRetried] = useState('')
  return (
    <main className="mx-auto max-w-760 px-20 py-32 sm:px-32">
      <article className="max-w-640 rounded-16 border border-heat-12 bg-heat-4 p-18">
        <header className="text-body-small text-foreground-muted">
          Dragana Bass &lt;dragana.bass@studierendenwerk-ulm.de&gt;
        </header>
        <MailBody text={normalizeEmailText(outlookText)} />
        <MessageAttachments
          attachments={attachments}
          onRetry={(id) => setRetried(id)}
        />
      </article>
      <output className="mt-16 block text-body-medium">{retried}</output>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing fixture root')
createRoot(root).render(
  <StrictMode>
    <InboxMessageFixture />
  </StrictMode>,
)
