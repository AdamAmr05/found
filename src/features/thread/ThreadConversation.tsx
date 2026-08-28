import type { ReactNode, UIEvent } from 'react'
import { useCallback, useRef, useState } from 'react'
import type { StickToBottomContext } from 'use-stick-to-bottom'
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom'

interface ThreadConversationProps {
  readonly children: ReactNode
}

export function ThreadConversation({ children }: ThreadConversationProps) {
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const [showTopFade, setShowTopFade] = useState(false)
  const setConversationContext = useCallback(
    (context: StickToBottomContext | null): void => {
      scrollContainerRef.current = context?.scrollRef.current ?? null
    },
    [],
  )

  function handleScroll(event: UIEvent<HTMLDivElement>): void {
    const container = scrollContainerRef.current
    if (!container || event.target !== container) return
    setShowTopFade(container.scrollTop > 4)
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <StickToBottom
        className="relative h-full w-full overflow-y-auto overscroll-contain"
        contextRef={setConversationContext}
        initial="smooth"
        resize="smooth"
        role="log"
        onScrollCapture={handleScroll}
      >
        <StickToBottom.Content className="mx-auto flex w-full max-w-720 flex-col gap-24 py-36 sm:py-44">
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
      <svg
        aria-hidden="true"
        className="size-18"
        fill="none"
        viewBox="0 0 20 20"
      >
        <path
          d="M4.5 7.5 10 13l5.5-5.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.7"
        />
      </svg>
    </button>
  )
}
