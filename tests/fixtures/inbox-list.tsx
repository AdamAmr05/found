import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

import type { Id } from '../../convex/_generated/dataModel'
import { InboxRow, type InboxItem } from '../../src/features/outreach/InboxRow'
import '../../src/styles/app.css'

function outreachId(value: string): Id<'outreachDrafts'> {
  // SAFETY: Fixture rows never reach a database; the id only keys the list.
  return value as Id<'outreachDrafts'>
}

const base = new Date('2026-09-10T11:05:00').getTime()

const items: InboxItem[] = [
  {
    outreachId: outreachId('sanddornweg'),
    threadId: 'thread',
    candidateTitle: 'Sanddornweg, Ulm-Einsingen — furnished 2-room apartment',
    recipient: 'johannes.pappert@outlook.de',
    subject: 'Interesse an der möblierten 2-Zimmer-Wohnung in Ulm-Einsingen',
    state: 'sent',
    unreadReplyCount: 0,
    latestActivityAt: base,
    canReadThread: true,
  },
  {
    outreachId: outreachId('studierendenwerk'),
    threadId: 'thread',
    candidateTitle:
      'Studierendenwerk Ulm — apartment category (residence to confirm)',
    recipient: 'wohnen@studierendenwerk-ulm.de',
    subject: 'Anfrage: Einzelapartment mit eigenem Bad ab November 2026',
    state: 'replied',
    unreadReplyCount: 1,
    latestActivityAt: base - 2 * 24 * 60 * 60 * 1000,
    canReadThread: true,
  },
  {
    outreachId: outreachId('lead'),
    threadId: 'thread',
    candidateTitle: 'Studierendenwerk Ulm — €343 apartment lead',
    recipient: '',
    subject: 'Inquiry about a possible €343 apartment from November 2026',
    state: 'draft',
    unreadReplyCount: 0,
    latestActivityAt: base - 5 * 24 * 60 * 60 * 1000,
    canReadThread: false,
  },
  {
    outreachId: outreachId('failed'),
    threadId: 'thread',
    candidateTitle: 'Gutenbergstraße 6 — small single apartment',
    recipient: 'wohnen@studierendenwerk-ulm.de',
    subject:
      'Inquiry about small single apartment at Gutenbergstraße 6 (November 2026–January 2027)',
    state: 'failed',
    unreadReplyCount: 0,
    latestActivityAt: base - 5 * 24 * 60 * 60 * 1000,
    canReadThread: true,
  },
]

function InboxListFixture() {
  const [opened, setOpened] = useState('')
  return (
    <main className="mx-auto w-full max-w-1040 px-20 py-40 sm:px-32">
      <h1 className="text-title-h4 text-accent-black">Inbox</h1>
      <div className="mt-32 grid gap-12">
        {items.map((item) => (
          <InboxRow
            key={item.outreachId}
            item={item}
            onOpen={() => setOpened(item.candidateTitle)}
          />
        ))}
      </div>
      <output className="mt-16 block text-body-medium">{opened}</output>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing fixture root')
createRoot(root).render(
  <StrictMode>
    <InboxListFixture />
  </StrictMode>,
)
