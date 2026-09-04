import { NotePencil, SidebarSimple } from '@phosphor-icons/react'
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from 'motion/react'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { ThreadHistoryPanel } from './ThreadHistoryPanel'
import { FoundHeader } from '../navigation/FoundHeader'

const controlClass =
  'grid size-40 place-items-center rounded-8 text-foreground-muted transition-colors hover:bg-accent-black/4 hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 disabled:opacity-50'

export function ThreadWorkspace({
  children,
  threadId,
  submitting,
  onNewThread,
  onSelectThread,
}: {
  readonly children: ReactNode
  readonly threadId: string | undefined
  readonly submitting: boolean
  readonly onNewThread: () => void
  readonly onSelectThread: (threadId: string) => void
}) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyTrigger = useRef<HTMLButtonElement>(null)
  const reducedMotion = useReducedMotion()
  const transition = {
    duration: reducedMotion ? 0 : 0.2,
    ease: [0.22, 1, 0.36, 1] as const,
  }

  return (
    <LazyMotion features={domAnimation}>
      <FoundHeader
        conversationControls={
          <div
            aria-label="Conversation controls"
            className="flex items-center gap-2"
            role="toolbar"
          >
            <button
              ref={historyTrigger}
              aria-label="Thread history"
              aria-expanded={historyOpen}
              aria-controls={historyOpen ? 'thread-history' : undefined}
              className={controlClass}
              type="button"
              title="Thread history"
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <SidebarSimple aria-hidden className="size-18" />
            </button>
            <AnimatePresence initial={false}>
              {!historyOpen ? (
                <m.button
                  key="new-thread"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reducedMotion ? 0 : 0.12 }}
                  aria-label="New thread"
                  className={controlClass}
                  disabled={submitting}
                  type="button"
                  title="New thread"
                  onClick={onNewThread}
                >
                  <NotePencil aria-hidden className="size-18" />
                </m.button>
              ) : null}
            </AnimatePresence>
          </div>
        }
      />
      <div className="relative flex min-h-0 min-w-0 flex-1 bg-accent-black/3">
        <AnimatePresence initial={false}>
          {historyOpen ? (
            <m.div
              key="thread-history"
              className="min-h-0 shrink-0 overflow-hidden max-md:w-0!"
              // Animate this single layout boundary so the fixed-width text and conversation surfaces never scale.
              initial={{ width: 0 }}
              animate={{ width: 248 }}
              exit={{ width: 0 }}
              transition={transition}
            >
              <ThreadHistoryPanel
                threadId={threadId}
                submitting={submitting}
                onClose={() => {
                  setHistoryOpen(false)
                  historyTrigger.current?.focus()
                }}
                onSelectThread={onSelectThread}
                onNewThread={onNewThread}
              />
            </m.div>
          ) : null}
        </AnimatePresence>
        <m.div
          initial={false}
          animate={{ borderTopLeftRadius: historyOpen ? 20 : 0 }}
          transition={transition}
          className="flex min-h-0 min-w-0 flex-1 flex-col bg-background-base max-md:rounded-none! md:shadow-[-1px_0_0_var(--color-border-faint)]"
        >
          {children}
        </m.div>
      </div>
    </LazyMotion>
  )
}
