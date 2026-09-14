import { motion } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

const HEIGHT = { duration: 0.26, ease: [0.2, 0, 0, 1] } as const

/**
 * The composer's one geometry owner. Content is measured, the surface
 * animates to it, and nothing inside animates its own height, so a growing
 * draft, a question, or the recording bar all arrive the same way. A 4px
 * inset keeps focus rings from being clipped by the overflow the animation
 * needs.
 */
export function MeasuredHeight({
  children,
  instant,
}: {
  readonly children: ReactNode
  readonly instant: boolean
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const element = contentRef.current
    if (!element) return
    // oxlint-disable-next-line react-hooks/set-state-in-effect -- the DOM is the source of truth for the measured height.
    setHeight(element.getBoundingClientRect().height)
    // Border box, not contentRect: the inset is part of the height.
    const observer = new ResizeObserver(() => {
      setHeight(element.getBoundingClientRect().height)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <motion.div
      animate={{ height: height ?? 'auto' }}
      className="-m-4 overflow-hidden"
      initial={false}
      transition={instant ? { duration: 0 } : HEIGHT}
    >
      <div ref={contentRef} className="p-4">
        {children}
      </div>
    </motion.div>
  )
}
