import { ArrowLeft, EnvelopeSimple, SpinnerGap } from '@phosphor-icons/react'
import type { FunctionReturnType } from 'convex/server'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useRef, useState } from 'react'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'
import { FoundHeader } from '../navigation/FoundHeader'

type MailThread = FunctionReturnType<typeof api.outreachInbox.read>

function activityLabel(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)
}

export function InboxPage() {
  const items = useQuery(api.outreachInbox.list, {})
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
    <main className="min-h-dvh bg-background-base">
      <FoundHeader />
      <section className="mx-auto w-full max-w-1040 px-20 py-40 sm:px-32 sm:py-56">
        {selectedId ? (
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
            All outreach
          </button>
        ) : (
          <>
            <p className="font-mono text-mono-small text-heat-100">INBOX</p>
            <h1 className="mt-12 text-title-h3 text-accent-black sm:text-title-h2">
              Conversations, outside the chat
            </h1>
            <p className="mt-12 max-w-620 text-body-large text-foreground-muted">
              Drafts, sent emails, and replies stay connected to the place that
              started them.
            </p>
          </>
        )}

        {selectedId ? (
          <ThreadDetail error={error} loading={loading} thread={thread} />
        ) : items === undefined ? (
          <p className="mt-40 font-mono text-mono-small text-foreground-muted">
            Loading outreach…
          </p>
        ) : items.length === 0 ? (
          <div className="mt-40 rounded-16 border border-border-faint bg-background-lighter p-24 text-center">
            <EnvelopeSimple
              aria-hidden
              className="mx-auto text-foreground-muted"
              size={24}
            />
            <p className="mt-10 text-label-large">No outreach yet</p>
            <p className="mx-auto mt-6 max-w-440 text-body-medium text-foreground-muted">
              Ask Found to draft an email to a place and it will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-32 overflow-hidden rounded-16 border border-border-muted bg-background-lighter shadow-surface-compact">
            {items.map((item) => (
              <button
                key={item.outreachId}
                aria-label={`Open outreach to ${item.candidateTitle}: ${item.subject || 'No subject'}`}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-16 border-b border-border-faint px-18 py-16 text-left last:border-b-0 hover:bg-background-base focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-heat-100 disabled:cursor-default disabled:opacity-60"
                disabled={!item.canReadThread}
                type="button"
                onClick={() => void select(item.outreachId, item.threadId)}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-8">
                    {item.unreadReplyCount > 0 ? (
                      <span
                        aria-label={`${item.unreadReplyCount} unread replies`}
                        className="size-7 shrink-0 rounded-full bg-heat-100"
                      />
                    ) : null}
                    <span className="truncate text-label-large">
                      {item.candidateTitle}
                    </span>
                  </span>
                  <span className="mt-4 block truncate text-body-medium text-foreground-muted">
                    {item.subject || 'No subject'} ·{' '}
                    {item.recipient || 'No recipient'}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block text-label-small text-accent-black capitalize">
                    {item.state}
                  </span>
                  <span className="mt-4 block text-mono-x-small text-foreground-muted">
                    {activityLabel(item.latestActivityAt)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

function ThreadDetail({
  error,
  loading,
  thread,
}: {
  readonly error: string | undefined
  readonly loading: boolean
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
            <p className="mt-12 text-body-large whitespace-pre-wrap">
              {message.body || 'No plain-text content.'}
            </p>
            {message.bodyTruncated ? (
              <p className="mt-10 text-body-small text-foreground-muted">
                Message shortened to 4,000 characters.
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  )
}
