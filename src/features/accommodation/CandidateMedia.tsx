import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'

import type { CandidateSnapshot } from '../../../shared/foundTools'

interface CandidateMediaProps {
  readonly candidate: CandidateSnapshot
  readonly compact?: boolean
}

export function CandidateMedia({
  candidate,
  compact = false,
}: CandidateMediaProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const reducedMotion = useReducedMotion()
  const image = candidate.images[activeIndex]

  if (!image) {
    return (
      <div
        className={`grid place-items-center bg-black/4 ${compact ? 'h-180' : 'h-248 md:h-292'}`}
      >
        <span className="font-mono text-mono-small text-foreground-muted">
          IMAGE NOT FOUND
        </span>
      </div>
    )
  }

  const move = (direction: -1 | 1) => {
    const count = candidate.images.length
    setActiveIndex((current) => (current + direction + count) % count)
  }

  return (
    <div
      className={`relative overflow-hidden bg-black/4 ${compact ? 'h-180 rounded-12' : 'h-248 md:h-292'}`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.img
          key={image.url}
          alt={image.alt}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 size-full object-cover outline-1 -outline-offset-1 outline-black/10"
          exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.02 }}
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.985 }}
          loading="lazy"
          src={image.url}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
        />
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-10 pt-32">
        <span className="rounded-full bg-white/92 px-9 py-5 font-mono text-mono-x-small text-accent-black">
          {candidate.images.length} photo
          {candidate.images.length === 1 ? '' : 's'}
        </span>
        {candidate.images.length > 1 ? (
          <div className="flex gap-6">
            <MediaButton label="Previous photo" onClick={() => move(-1)}>
              ←
            </MediaButton>
            <MediaButton label="Next photo" onClick={() => move(1)}>
              →
            </MediaButton>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MediaButton({
  children,
  label,
  onClick,
}: {
  readonly children: string
  readonly label: string
  readonly onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      className="grid size-42 place-items-center rounded-full bg-white/92 text-body-large text-accent-black transition-transform active:scale-[0.96]"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}
