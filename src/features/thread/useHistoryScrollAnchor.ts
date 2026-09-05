import type { RefObject } from 'react'
import { useEffect, useLayoutEffect, useRef } from 'react'

type ScrollAnchor = {
  key: string
  oldestKey: string | undefined
  top: number
}

// Keep the last painted message position, not an accumulated scroll delta.
// Pages can render before LoadingMore finishes, and scroll events can also be
// caused by layout corrections rather than the user's wheel or touch gesture.
export function useHistoryScrollAnchor(
  containerRef: RefObject<HTMLElement | null>,
  loading: boolean,
): () => void {
  const anchorRef = useRef<ScrollAnchor | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !loading) return
    function holdAtHistoryBoundary(event: WheelEvent): void {
      if (
        !container ||
        container.scrollTop > 32 ||
        event.deltaY >= 0 ||
        event.ctrlKey
      )
        return
      for (const target of event.composedPath()) {
        if (target === container) break
        if (target instanceof HTMLElement && target.scrollTop > 0) return
      }
      // Do not queue upward wheel motion against the exhausted page while its
      // replacement is loading. Let downward motion leave the boundary normally.
      event.preventDefault()
    }
    container.addEventListener('wheel', holdAtHistoryBoundary, {
      passive: false,
    })
    return () => container.removeEventListener('wheel', holdAtHistoryBoundary)
  }, [containerRef, loading])

  function captureAnchor(): void {
    const container = containerRef.current
    if (!container) return
    const top = container.getBoundingClientRect().top
    const messages =
      container.querySelectorAll<HTMLElement>('[data-message-key]')
    const anchor = [...messages].find((element) => {
      const bounds = element.getBoundingClientRect()
      return bounds.height > 0 && bounds.bottom > top
    })
    anchorRef.current = anchor?.dataset.messageKey
      ? {
          key: anchor.dataset.messageKey,
          oldestKey: messages[0]?.dataset.messageKey,
          top: anchor.getBoundingClientRect().top,
        }
      : null
  }

  // Reconcile after each DOM commit, including pages arriving during loading.
  // Reading geometry here keeps the adjustment ahead of paint.
  useLayoutEffect(() => {
    const container = containerRef.current
    const anchor = anchorRef.current
    if (!container) return
    const messages =
      container.querySelectorAll<HTMLElement>('[data-message-key]')
    if (anchor && messages[0]?.dataset.messageKey !== anchor.oldestKey) {
      const element = [...messages].find(
        (message) => message.dataset.messageKey === anchor.key,
      )
      if (element) {
        container.scrollTop += element.getBoundingClientRect().top - anchor.top
      }
    }
    captureAnchor()
  })

  return captureAnchor
}
