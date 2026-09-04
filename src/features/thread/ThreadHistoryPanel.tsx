import { NotePencil, SidebarSimple } from '@phosphor-icons/react'
import { usePaginatedQuery } from 'convex/react'
import { m, useIsPresent, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'

import { api } from '../../../convex/_generated/api'

const PAGE_SIZE = 20
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100'

export function ThreadHistoryPanel({
  threadId,
  submitting,
  onClose,
  onSelectThread,
  onNewThread,
}: {
  readonly threadId: string | undefined
  readonly submitting: boolean
  readonly onClose: () => void
  readonly onSelectThread: (threadId: string) => void
  readonly onNewThread: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isPresent = useIsPresent()
  const reducedMotion = useReducedMotion()
  const { results, status, loadMore } = usePaginatedQuery(
    api.threadHistory.list,
    {},
    { initialNumItems: PAGE_SIZE },
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const trigger = document.activeElement
    const mobile = window.matchMedia('(max-width: 767px)')
    function present(): void {
      if (!dialog) return
      dialog.close()
      if (mobile.matches) dialog.showModal()
      else dialog.show()
    }
    present()
    mobile.addEventListener('change', present)
    return () => {
      mobile.removeEventListener('change', present)
      dialog.close()
      // React removes the modal before passive cleanup; restore its opener explicitly.
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  function closeOnMobile(): void {
    if (dialogRef.current?.matches(':modal')) onClose()
  }

  function dismissBackdrop(event: MouseEvent<HTMLDialogElement>): void {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      onClose()
  }

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Native dialog owns mobile focus; Escape and backdrop dismissal have keyboard equivalents.
    <m.dialog
      ref={dialogRef}
      initial={{ opacity: 0, x: reducedMotion ? 0 : -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reducedMotion ? 0 : -4 }}
      transition={{
        duration: reducedMotion ? 0 : 0.16,
        ease: [0.22, 1, 0.36, 1],
      }}
      inert={!isPresent}
      id="thread-history"
      aria-labelledby="thread-history-title"
      className="thread-history fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-288 max-w-[85vw] overflow-hidden rounded-r-20 border-0 bg-background-base p-0 text-accent-black shadow-surface-artifact backdrop:bg-accent-black/20 open:flex open:flex-col md:relative md:inset-auto md:h-full md:w-248 md:shrink-0 md:rounded-none md:bg-transparent md:shadow-none"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }}
      onClick={dismissBackdrop}
    >
      <div className="flex h-64 shrink-0 items-center justify-between gap-8 px-20 md:hidden">
        <h2 id="thread-history-title" className="text-label-medium">
          History
        </h2>
        <button
          aria-label="Close history"
          type="button"
          className={`grid size-40 place-items-center rounded-8 text-foreground-muted hover:bg-accent-black/4 ${focus}`}
          onClick={onClose}
        >
          <SidebarSimple aria-hidden className="size-18" />
        </button>
      </div>
      <button
        type="button"
        disabled={submitting}
        onClick={() => {
          onNewThread()
          closeOnMobile()
        }}
        className={`mx-12 mt-4 mb-28 flex min-h-40 items-center gap-10 rounded-10 bg-background-lighter px-12 text-label-small shadow-surface-compact transition-colors hover:bg-accent-white disabled:opacity-50 md:mt-20 ${focus}`}
      >
        <NotePencil aria-hidden className="size-18" />
        New thread
      </button>
      <nav
        aria-label="Conversations"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-12 pb-20"
      >
        <p className="mb-8 px-12 text-label-x-small text-foreground-muted">
          Conversations
        </p>
        {status === 'LoadingFirstPage' ? (
          <output className="block px-12 py-16 text-body-small text-foreground-muted">
            Loading history…
          </output>
        ) : null}
        {status === 'Exhausted' && results.length === 0 ? (
          <p className="px-12 py-16 text-body-small text-foreground-muted">
            Your conversations will appear here.
          </p>
        ) : null}
        <ul className="flex flex-col gap-2">
          {results.map((thread) => (
            <li key={thread._id}>
              <button
                type="button"
                disabled={submitting}
                aria-current={thread._id === threadId ? 'page' : undefined}
                title={thread.title ?? 'Untitled conversation'}
                onClick={() => {
                  onSelectThread(thread._id)
                  closeOnMobile()
                }}
                className={`flex min-h-40 w-full items-center rounded-8 px-12 py-10 text-left text-accent-black/75 transition-colors hover:bg-background-lighter/60 hover:text-accent-black disabled:opacity-50 aria-[current=page]:bg-background-lighter aria-[current=page]:text-accent-black aria-[current=page]:shadow-[0_1px_3px_var(--color-border-faint),inset_0_0_0_1px_var(--color-border-faint)] ${focus}`}
              >
                <span className="truncate text-label-small">
                  {thread.title ?? 'Untitled conversation'}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {status === 'CanLoadMore' || status === 'LoadingMore' ? (
          <button
            type="button"
            disabled={status === 'LoadingMore'}
            onClick={() => loadMore(PAGE_SIZE)}
            className={`mt-8 min-h-40 w-full rounded-8 text-label-small text-foreground-muted hover:bg-accent-black/4 ${focus}`}
          >
            {status === 'LoadingMore' ? 'Loading…' : 'Load more'}
          </button>
        ) : null}
      </nav>
    </m.dialog>
  )
}
