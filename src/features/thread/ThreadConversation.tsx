import { CaretDown } from '@phosphor-icons/react'
import type { ReactNode, UIEvent } from 'react'
import { useCallback, useRef, useState } from 'react'
import type { StickToBottomContext } from 'use-stick-to-bottom'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'

import { useHistoryScrollAnchor } from './useHistoryScrollAnchor'

interface ThreadConversationProps {
  readonly children: ReactNode
  readonly canLoadOlderMessages: boolean
  readonly loadingOlderMessages: boolean
  readonly onLoadOlderMessages: () => void
}

export function ThreadConversation({
  children,
  canLoadOlderMessages,
  loadingOlderMessages,
  onLoadOlderMessages,
}: ThreadConversationProps) {
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const contextRef = useRef<StickToBottomContext | null>(null)
  const previousScrollTopRef = useRef(0)
  const captureAnchor = useHistoryScrollAnchor(
    scrollContainerRef,
    loadingOlderMessages,
  )
  const [showTopFade, setShowTopFade] = useState(false)
  const setConversationContext = useCallback(
    (context: StickToBottomContext | null): void => {
      contextRef.current = context
      scrollContainerRef.current = context?.scrollRef.current ?? null
    },
    [],
  )

  function loadOlderMessages(): void {
    const container = scrollContainerRef.current
    if (!container || !canLoadOlderMessages || loadingOlderMessages) return
    captureAnchor()
    contextRef.current?.stopScroll()
    onLoadOlderMessages()
  }

  function handleScroll(event: UIEvent<HTMLDivElement>): void {
    const container = scrollContainerRef.current
    if (!container || event.target !== container) return
    const scrollingUp = container.scrollTop < previousScrollTopRef.current
    captureAnchor()
    previousScrollTopRef.current = container.scrollTop
    setShowTopFade(container.scrollTop > 4)
    if (scrollingUp && container.scrollTop <= 32) loadOlderMessages()
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <StickToBottom
        className="relative h-full w-full overflow-hidden"
        contextRef={setConversationContext}
        initial="smooth"
        resize="smooth"
        role="log"
        onScrollCapture={handleScroll}
      >
        <StickToBottom.Content
          className="mx-auto flex w-full max-w-784 flex-col gap-24 px-20 py-36 sm:px-32 sm:py-44"
          scrollClassName="overflow-y-auto overscroll-contain"
        >
          {canLoadOlderMessages || loadingOlderMessages ? (
            <div className="flex min-h-40 justify-center" aria-live="polite">
              <button
                className="min-h-40 rounded-10 px-14 text-label-small text-foreground-muted hover:bg-accent-black/4 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 disabled:cursor-wait"
                type="button"
                disabled={loadingOlderMessages}
                onClick={loadOlderMessages}
              >
                {loadingOlderMessages
                  ? 'Loading older messages…'
                  : 'Load older messages'}
              </button>
            </div>
          ) : null}
          {children}
        </StickToBottom.Content>
        <ConversationScrollButton />
      </StickToBottom>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-background-base via-background-base/64 to-transparent transition-opacity duration-150 ${
          showTopFade ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  )
}

function ConversationScrollButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  const handleScrollToBottom = useCallback((): void => {
    void scrollToBottom()
  }, [scrollToBottom])

  if (isAtBottom) return null

  return (
    <button
      aria-label="Jump to latest message"
      className="absolute bottom-16 left-1/2 z-20 grid size-40 -translate-x-1/2 place-items-center rounded-full bg-background-lighter text-accent-black shadow-surface-compact transition-[transform,box-shadow] duration-150 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 active:translate-y-0 active:scale-[0.98]"
      type="button"
      onClick={handleScrollToBottom}
    >
      <CaretDown aria-hidden className="size-18" weight="regular" />
    </button>
  )
}
