import { ArrowLeft, EnvelopeSimple, SpinnerGap } from '@phosphor-icons/react'
import type { FunctionReturnType } from 'convex/server'
import { useAction, useMutation, usePaginatedQuery } from 'convex/react'
import { useRef, useState } from 'react'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import {
  InboxFilter,
  type InboxStateFilter,
  inboxFilterLabel,
  inboxFilterState,
} from './InboxFilter'
import { InboxRow } from './InboxRow'
import { MailBody } from './MailBody'
import { StoredMessageAttachments } from './MessageAttachments'

type MailThread = FunctionReturnType<typeof api.outreachInbox.read>
const INBOX_PAGE_SIZE = 20

export function InboxPage() {
  const readThread = useAction(api.outreachInbox.read)
  const markRead = useMutation(api.outreachInbox.markRead)
  const [selectedId, setSelectedId] = useState<Id<'outreachDrafts'>>()
  const [thread, setThread] = useState<MailThread>()
  const [error, setError] = useState<string>()
  const requestSequence = useRef(0)
  const loading = selectedId !== undefined && thread === undefined && !error

  async function select(
    outreachId: Id<'outreachDrafts'>,
    foundThreadId: string,
  ): Promise<void> {
    const request = ++requestSequence.current
    setSelectedId(outreachId)
    setThread(undefined)
    setError(undefined)
    try {
      const nextThread = await readThread({
        outreachId,
        threadId: foundThreadId,
      })
      if (request === requestSequence.current) {
        setThread(nextThread)
        void markRead({
          outreachId,
          observedReplyRevision: nextThread.observedReplyRevision,
        }).catch(globalThis.reportError)
      }
    } catch (cause) {
      globalThis.reportError(cause)
      if (request === requestSequence.current) {
        setError('That email thread could not be loaded.')
      }
    }
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <section className="mx-auto w-full max-w-1040 px-20 py-40 sm:px-32 sm:py-56">
        {selectedId ? (
          <>
            <button
              className="mb-20 flex items-center gap-7 text-label-small text-foreground-muted hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100"
              type="button"
              onClick={() => {
                requestSequence.current += 1
                setSelectedId(undefined)
                setThread(undefined)
                setError(undefined)
              }}
            >
              <ArrowLeft aria-hidden size={15} />
              Inbox
            </button>
            <ThreadDetail
              error={error}
              loading={loading}
              outreachId={selectedId}
              thread={thread}
            />
          </>
        ) : null}
        {/* Keep the filter and loaded pages alive while reading a conversation. */}
        <div hidden={selectedId !== undefined}>
          <InboxList
            onOpen={(outreachId, foundThreadId) =>
              void select(outreachId, foundThreadId)
            }
          />
        </div>
      </section>
    </main>
  )
}

/** The filtered, paginated conversation list: owns its query and empty states. */
function InboxList({
  onOpen,
}: {
  readonly onOpen: (
    outreachId: Id<'outreachDrafts'>,
    foundThreadId: string,
  ) => void
}) {
  const [filter, setFilter] = useState<InboxStateFilter>('all')
  const state = inboxFilterState(filter)
  const inbox = usePaginatedQuery(
    api.outreachInbox.list,
    state ? { state } : {},
    { initialNumItems: INBOX_PAGE_SIZE },
  )
  const items = inbox.results
  const canLoadMore =
    inbox.status === 'CanLoadMore' || inbox.status === 'LoadingMore'

  return (
    <>
      <h1 className="text-title-h4 text-accent-black">Inbox</h1>
      <p className="mt-12 max-w-620 text-body-large text-foreground-muted">
        Drafts, sent emails, and replies.
      </p>
      <div className="mt-24">
        <InboxFilter value={filter} onChange={setFilter} />
      </div>
      {inbox.status === 'LoadingFirstPage' ? (
        <p className="mt-40 font-mono text-mono-small text-foreground-muted">
          Loading outreach…
        </p>
      ) : items.length === 0 ? (
        <InboxEmpty filter={filter} />
      ) : (
        <div className="mt-20 grid gap-12">
          {items.map((item) => (
            <InboxRow
              key={item.outreachId}
              item={item}
              onOpen={() => onOpen(item.outreachId, item.threadId)}
            />
          ))}
        </div>
      )}
      {canLoadMore ? (
        <div className="mt-24 flex justify-center">
          <button
            className="min-h-44 rounded-10 border border-border-muted bg-background-lighter px-16 py-10 text-label-small text-accent-black transition-colors hover:border-border-loud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 disabled:cursor-default disabled:opacity-60"
            type="button"
            disabled={inbox.status === 'LoadingMore'}
            onClick={() => inbox.loadMore(INBOX_PAGE_SIZE)}
          >
            {inbox.status === 'LoadingMore'
              ? 'Loading…'
              : 'Load more conversations'}
          </button>
        </div>
      ) : null}
    </>
  )
}

function InboxEmpty({ filter }: { readonly filter: InboxStateFilter }) {
  return (
    <div className="surface-paper mt-20 rounded-16 p-24 text-center">
      <EnvelopeSimple
        aria-hidden
        className="mx-auto text-foreground-muted"
        size={24}
      />
      <p className="mt-10 text-label-large">
        {filter === 'all'
          ? 'No outreach yet'
          : `Nothing under ${inboxFilterLabel(filter)}`}
      </p>
      <p className="mx-auto mt-6 max-w-440 text-body-medium text-foreground-muted">
        {filter === 'all'
          ? 'Ask Found to draft an email to a place and it will appear here.'
          : 'Conversations move here as their delivery state changes.'}
      </p>
    </div>
  )
}

function ThreadDetail({
  error,
  loading,
  outreachId,
  thread,
}: {
  readonly error: string | undefined
  readonly loading: boolean
  readonly outreachId: Id<'outreachDrafts'>
  readonly thread: MailThread | undefined
}) {
  if (loading) {
    return (
      <p className="mt-40 flex items-center gap-8 text-body-medium text-foreground-muted">
        <SpinnerGap aria-hidden className="animate-spin" size={16} />
        Loading conversation…
      </p>
    )
  }
  if (error) {
    return (
      <p className="mt-40 text-body-medium text-accent-crimson" role="alert">
        {error}
      </p>
    )
  }
  if (!thread) return null
  return (
    <div className="mx-auto max-w-760">
      <p className="font-mono text-mono-small text-heat-100">EMAIL THREAD</p>
      <h1 className="mt-10 text-title-h4">{thread.candidateTitle}</h1>
      <p className="mt-6 text-body-large text-foreground-muted">
        {thread.subject}
      </p>
      {thread.omittedMessageCount > 0 ? (
        <p className="mt-16 text-body-small text-foreground-muted">
          Showing the latest messages; {thread.omittedMessageCount} older
          {thread.omittedMessageCount === 1 ? ' message was' : ' messages were'}
          omitted.
        </p>
      ) : null}
      <div className="mt-28 grid gap-12">
        {thread.messages.map((message) => (
          <article
            key={message.messageId}
            className={`max-w-640 rounded-16 border p-18 ${
              message.direction === 'outbound'
                ? 'ml-auto border-border-muted bg-background-lighter'
                : 'mr-auto border-heat-12 bg-heat-4'
            }`}
          >
            <header className="flex flex-wrap items-center justify-between gap-8 text-body-small text-foreground-muted">
              <span>{message.from}</span>
              <time dateTime={message.timestamp}>
                {new Date(message.timestamp).toLocaleString()}
              </time>
            </header>
            {message.body ? (
              <MailBody text={message.body} />
            ) : (
              <p className="mt-12 text-body-large text-foreground-muted">
                No plain-text content.
              </p>
            )}
            {message.bodyTruncated ? (
              <p className="mt-10 text-body-small text-foreground-muted">
                Message shortened to 4,000 characters.
              </p>
            ) : null}
            {message.direction === 'inbound' &&
            message.attachments.length > 0 ? (
              <StoredMessageAttachments
                outreachId={outreachId}
                messageId={message.messageId}
              />
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}
