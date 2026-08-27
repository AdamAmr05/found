import { motion, useMotionValue, useMotionValueEvent } from 'motion/react'
import type { Dispatch, SetStateAction } from 'react'
import { useRef } from 'react'
import { euros } from '../candidates'

/** Pixels of travel per step, and the step itself. Money moves in tens. */
const pixelsPerStep = 6
const step = 10

/**
 * A requirement stated inside the assistant's own sentence, and editable there.
 * The alternative is a settings panel somewhere else, which quietly turns the
 * conversation into a read-only log of decisions made elsewhere. Dragging
 * commits in whole steps, so state changes at a boundary the user can feel
 * rather than on every frame.
 */
export function ScrubbableAmount({
  bounds,
  label,
  onChange,
  value,
}: {
  readonly bounds: { readonly low: number; readonly high: number }
  readonly label: string
  /** Takes React's updater form so repeated key presses compose correctly. */
  readonly onChange: Dispatch<SetStateAction<number>>
  readonly value: number
}) {
  const drag = useMotionValue(0)
  const origin = useRef(value)

  const clamp = (next: number) =>
    Math.min(bounds.high, Math.max(bounds.low, next))

  useMotionValueEvent(drag, 'change', (offset) => {
    const next = clamp(
      origin.current + Math.round(offset / pixelsPerStep) * step,
    )
    if (next !== value) onChange(next)
  })

  return (
    <motion.button
      aria-label={`${label}, ${euros(value)}. Drag or use the arrow keys to change it.`}
      className="relative -mx-2 cursor-ew-resize rounded-4 px-2 font-mono text-mono-medium text-heat-100 tabular-nums underline decoration-heat-100/40 decoration-dotted underline-offset-4 hover:bg-heat-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      dragMomentum={false}
      onDragStart={() => {
        origin.current = value
      }}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        const size = event.shiftKey ? step * 5 : step
        const direction = event.key === 'ArrowRight' ? size : -size
        onChange((current) => clamp(current + direction))
      }}
      style={{ x: drag }}
      type="button"
      whileDrag={{ scale: 1.04 }}
      whileHover={{ y: -1 }}
    >
      {euros(value)}
    </motion.button>
  )
}
