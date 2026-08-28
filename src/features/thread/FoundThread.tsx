import { optimisticallySendMessage } from '@convex-dev/agent/react'
import { useUIMessages } from '@convex-dev/agent/react'
import { Link } from '@tanstack/react-router'
import {
  useSessionIdArg,
  useSessionMutation,
} from 'convex-helpers/react/sessions'
import { useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

import { api } from '../../../convex/_generated/api'
import {
  ThreadMessage,
  ThinkingStep,
  type FoundUIMessage,
} from './ThreadMessage'
import { ThreadConversation } from './ThreadConversation'

const THREAD_STORAGE_KEY = 'found-active-thread-id'

const STARTERS = [
  'I need somewhere in Berlin from October for six months.',
  'Help me find a month-long stay in Lisbon near a metro line.',
] as const

function readStoredThreadId(): string | undefined {
  return window.sessionStorage.getItem(THREAD_STORAGE_KEY) ?? undefined
}

function writeStoredThreadId(threadId: string | undefined): void {
  if (threadId) {
    window.sessionStorage.setItem(THREAD_STORAGE_KEY, threadId)
  } else {
    window.sessionStorage.removeItem(THREAD_STORAGE_KEY)
  }
}

export function FoundThread() {
  const [threadId, setThreadId] = useState<string>()
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string>()
  const startThread = useSessionMutation(api.thread.start)
  const sendMessage = useSessionMutation(api.thread.send).withOptimisticUpdate(
    (store, args) => {
      optimisticallySendMessage(api.thread.listMessages)(store, {
        threadId: args.threadId,
        prompt: args.prompt,
      })
    },
  )
  const messageArgs = useSessionIdArg(
    threadId ? { threadId } : ('skip' as const),
  )
  const messageQuery = useUIMessages(api.thread.listMessages, messageArgs, {
    initialNumItems: 40,
    stream: true,
  })
  // SAFETY: listMessages returns the Agent component's UIMessage values unchanged.
  // The Agent component owns the full message union. Found narrows only its
  // three stable tool parts in ThreadMessage.
  const messages = messageQuery.results as FoundUIMessage[]
  const latestMessage = messages.at(-1)
  const runActive = Boolean(
    latestMessage?.role === 'user' ||
    (latestMessage?.role === 'assistant' &&
      (latestMessage.status === 'pending' ||
        latestMessage.status === 'streaming')),
  )

  useEffect(() => {
    // oxlint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is an external system unavailable during SSR.
    setThreadId(readStoredThreadId())
  }, [])

  async function submit(promptOverride?: string): Promise<void> {
    const prompt = (promptOverride ?? draft).trim()
    if (!prompt || submitting || runActive) return

    setSubmitting(true)
    setSubmitError(undefined)
    setDraft('')
    try {
      if (threadId) {
        await sendMessage({ threadId, prompt })
      } else {
        const newThreadId = await startThread({ prompt })
        writeStoredThreadId(newThreadId)
        setThreadId(newThreadId)
      }
    } catch (error) {
      setDraft(prompt)
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'The message could not be sent.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function startNewThread(): void {
    writeStoredThreadId(undefined)
    setThreadId(undefined)
    setDraft('')
    setSubmitError(undefined)
  }

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-background-base">
      <FoundHeader hasThread={Boolean(threadId)} onNewThread={startNewThread} />
      <section className="mx-auto flex min-h-0 w-full max-w-920 flex-1 flex-col overflow-hidden px-20 sm:px-32">
        {threadId && messageQuery.status === 'LoadingFirstPage' ? (
          <div className="grid flex-1 place-items-center">
            <ThinkingStep label="Opening thread" />
          </div>
        ) : !threadId || messages.length === 0 ? (
          <EmptyThread
            disabled={submitting}
            onSelect={(prompt) => void submit(prompt)}
          />
        ) : (
          <ThreadConversation>
            <div className="flex flex-col gap-32">
              {messages.map((message) => (
                <ThreadMessage
                  key={message.key}
                  message={message}
                  threadId={threadId}
                />
              ))}
              {submitting && !runActive ? <ThinkingStep /> : null}
            </div>
          </ThreadConversation>
        )}
        <div className="mt-auto shrink-0 bg-gradient-to-t from-background-base via-background-base to-transparent pt-20 pb-20 sm:pt-24 sm:pb-28">
          <div className="mx-auto max-w-720">
            {submitError ? (
              <p
                className="mb-10 text-body-small text-accent-crimson"
                role="alert"
              >
                {submitError}
              </p>
            ) : null}
            <Composer
              disabled={submitting || runActive}
              value={draft}
              onChange={setDraft}
              onSubmit={() => void submit()}
            />
            <p className="mt-8 text-center font-mono text-mono-x-small text-foreground-muted">
              Live research · sources stay attached to what Found shows
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

function FoundHeader({
  hasThread,
  onNewThread,
}: {
  hasThread: boolean
  onNewThread: () => void
}) {
  return (
    <header className="z-20 shrink-0 border-b border-border-faint bg-background-base/90 backdrop-blur-xl">
      <div className="mx-auto flex h-64 max-w-1120 items-center justify-between px-20 sm:px-32">
        <Link className="text-label-large text-accent-black" to="/">
          found
        </Link>
        <nav className="flex items-center gap-6" aria-label="Prototype routes">
          <Link
            className="rounded-8 px-10 py-8 text-label-small text-foreground-muted transition-colors hover:bg-background-lighter hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
            to="/playground"
          >
            Playground
          </Link>
          <Link
            className="hidden rounded-8 px-10 py-8 text-label-small text-foreground-muted transition-colors hover:bg-background-lighter hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 sm:block"
            to="/lab"
          >
            Lab
          </Link>
          {hasThread ? (
            <button
              className="rounded-8 border border-border-muted bg-background-lighter px-12 py-8 text-label-small text-accent-black transition-colors hover:border-border-loud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
              type="button"
              onClick={onNewThread}
            >
              New thread
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  )
}

function EmptyThread({
  disabled,
  onSelect,
}: {
  disabled: boolean
  onSelect: (prompt: string) => void
}) {
  return (
    <div className="my-auto flex w-full flex-col items-center py-56 text-center">
      <p className="font-mono text-mono-small text-heat-100">
        ACCOMMODATION RESEARCH
      </p>
      <h1 className="mt-16 max-w-660 text-title-h2 text-accent-black sm:text-title-h1">
        Where do you need to live?
      </h1>
      <p className="mt-16 max-w-560 text-body-large text-foreground-muted">
        Tell Found the place, timing, budget, and whatever would make an option
        actually work. It will ask only when something important is missing.
      </p>
      <div className="mt-28 grid w-full max-w-640 gap-10 sm:grid-cols-2">
        {STARTERS.map((prompt) => (
          <button
            key={prompt}
            className="rounded-12 border border-border-muted bg-background-lighter p-16 text-left text-body-medium text-accent-black shadow-[0_1px_2px_rgba(38,38,38,0.03)] transition-[border-color,transform,box-shadow] duration-150 hover:-translate-y-1 hover:border-border-loud hover:shadow-[0_8px_24px_rgba(38,38,38,0.06)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
            disabled={disabled}
            type="button"
            onClick={() => onSelect(prompt)}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}

function Composer({
  disabled,
  value,
  onChange,
  onSubmit,
}: {
  disabled: boolean
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    onSubmit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit()
    }
  }

  return (
    <form
      className="rounded-20 border border-border-muted bg-background-lighter p-8 shadow-[0_14px_44px_rgba(38,38,38,0.08),0_1px_2px_rgba(38,38,38,0.04)] focus-within:border-border-loud"
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="found-message">
        Message Found
      </label>
      <textarea
        id="found-message"
        className="max-h-180 min-h-64 w-full resize-none bg-transparent px-10 py-10 text-body-input text-accent-black outline-none placeholder:text-foreground-muted disabled:opacity-50"
        disabled={disabled}
        placeholder="Tell Found what you’re looking for…"
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="flex items-center justify-between gap-12 pl-10">
        <span className="font-mono text-mono-x-small text-foreground-muted">
          Enter to send · Shift Enter for a new line
        </span>
        <button
          aria-label="Send message"
          className="grid size-42 shrink-0 place-items-center rounded-12 bg-heat-100 text-white shadow-[0_2px_7px_rgba(250,93,25,0.24)] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 active:scale-[0.96] disabled:bg-border-loud disabled:shadow-none"
          disabled={disabled || value.trim().length === 0}
          type="submit"
        >
          <svg
            aria-hidden="true"
            className="size-19"
            viewBox="0 0 20 20"
            fill="none"
          >
            <path
              d="M4 10h11M11 5l5 5-5 5"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
            />
          </svg>
        </button>
      </div>
    </form>
  )
}
