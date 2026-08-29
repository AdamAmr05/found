import { optimisticallySendMessage } from '@convex-dev/agent/react'
import { useUIMessages } from '@convex-dev/agent/react'
import {
  useSessionIdArg,
  useSessionMutation,
} from 'convex-helpers/react/sessions'
import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

import { api } from '../../../convex/_generated/api'
import {
  ThreadMessage,
  ThinkingStep,
  type FoundUIMessage,
} from './ThreadMessage'
import { ThreadConversation } from './ThreadConversation'
import { FoundHeader } from '../navigation/FoundHeader'
import { ThreadShortlist } from '../saved-candidates/ThreadShortlist'
import { useResumableThread } from './useResumableThread'

const STARTERS = [
  'I need somewhere in Berlin from October for six months.',
  'Help me find a month-long stay in Lisbon near a metro line.',
] as const

export function FoundThread() {
  const { forgetThread, rememberThread, threadId } = useResumableThread()
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
    threadId &&
    (latestMessage?.role === 'user' ||
      (latestMessage?.role === 'assistant' &&
        (latestMessage.status === 'pending' ||
          latestMessage.status === 'streaming'))),
  )

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
        rememberThread(newThreadId)
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
    forgetThread()
    setDraft('')
    setSubmitError(undefined)
  }

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-background-base">
      <FoundHeader {...(threadId ? { onNewThread: startNewThread } : {})} />
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
            <div className="flex flex-col gap-24">
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
        <div className="mt-auto shrink-0 bg-gradient-to-t from-background-base via-background-base to-transparent pt-16 pb-16 sm:pt-20 sm:pb-22">
          <div className="mx-auto max-w-720">
            {threadId ? <ThreadShortlist threadId={threadId} /> : null}
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
      <p className="mt-14 max-w-560 text-body-medium text-foreground-muted">
        Tell Found the place, timing, budget, and whatever would make an option
        actually work. It will ask only when something important is missing.
      </p>
      <div className="mt-24 grid w-full max-w-640 gap-10 sm:grid-cols-2">
        {STARTERS.map((prompt) => (
          <button
            key={prompt}
            className="rounded-12 bg-background-lighter p-16 text-left text-body-medium text-accent-black shadow-surface-compact transition-[transform,box-shadow] duration-150 hover:-translate-y-1 hover:shadow-surface-raised focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const currentHeight = textarea.getBoundingClientRect().height
    const transition = textarea.style.transition
    textarea.style.transition = 'none'
    textarea.style.minHeight = '0px'
    textarea.style.height = '0px'
    const nextHeight = Math.min(160, Math.max(40, textarea.scrollHeight))
    textarea.style.minHeight = ''
    textarea.style.height = `${currentHeight}px`
    void textarea.offsetHeight
    textarea.style.transition = transition

    const frame = requestAnimationFrame(() => {
      textarea.style.height = `${nextHeight}px`
    })
    return () => cancelAnimationFrame(frame)
  }, [value])

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
      className="rounded-20 bg-background-lighter p-10 shadow-surface-raised"
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="found-message">
        Message Found
      </label>
      <textarea
        ref={textareaRef}
        id="found-message"
        className="min-h-40 w-full resize-none overflow-y-auto bg-transparent px-8 py-6 text-body-input text-accent-black transition-[height] duration-200 ease-[cubic-bezier(0.2,0,0,1)] outline-none placeholder:text-foreground-muted disabled:opacity-50"
        disabled={disabled}
        placeholder="Tell Found what you’re looking for…"
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="flex items-center justify-between gap-12 pl-8">
        <span className="font-mono text-mono-x-small text-foreground-muted">
          Enter to send · Shift Enter for a new line
        </span>
        <button
          aria-label="Send message"
          className="grid size-36 shrink-0 place-items-center rounded-8 bg-heat-100 text-white shadow-action-heat transition-[transform,background-color,color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 active:scale-[0.995] disabled:bg-black/8 disabled:text-foreground-muted disabled:shadow-none"
          disabled={disabled || value.trim().length === 0}
          type="submit"
        >
          <svg
            aria-hidden="true"
            className="size-18"
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
