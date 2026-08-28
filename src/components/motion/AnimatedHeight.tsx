import { m, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'

interface AnimatedHeightProps {
  readonly children: ReactNode
  readonly minimum?: number
  readonly open?: boolean
}

export function AnimatedHeight({
  children,
  minimum = 0,
  open = true,
}: AnimatedHeightProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState(minimum)
  const reducedMotion = useReducedMotion()

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return

    const measure = () =>
      setContentHeight(content.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  return (
    <m.div
      animate={{ height: open ? Math.max(minimum, contentHeight) : 0 }}
      className="overflow-hidden"
      initial={false}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: 'spring', bounce: 0, duration: 0.32 }
      }
    >
      <div ref={contentRef}>{children}</div>
    </m.div>
  )
}
