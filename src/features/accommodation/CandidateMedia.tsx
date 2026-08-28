import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import type { CandidateSnapshot } from '../../../shared/foundTools'
import { CandidateImageFallback } from './CandidateImageFallback'

interface CandidateMediaProps {
  readonly candidate: CandidateSnapshot
  readonly compact?: boolean
}

export function CandidateMedia({
  candidate,
  compact = false,
}: CandidateMediaProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const reducedMotion = useReducedMotion()
  const usableImages = candidate.images.filter(
    (candidateImage) => !failedUrls.has(candidateImage.url),
  )
  const safeIndex =
    usableImages.length === 0 ? 0 : activeIndex % usableImages.length
  const image = usableImages[safeIndex]

  if (!image) {
    return (
      <div className={compact ? 'h-180 rounded-12' : 'h-248 md:h-292'}>
        <CandidateImageFallback compact={compact} />
      </div>
    )
  }

  const move = (direction: -1 | 1) => {
    const count = usableImages.length
    setActiveIndex((safeIndex + direction + count) % count)
  }

  const handleImageError = (): void => {
    setFailedUrls((current) => new Set([...current, image.url]))
    setActiveIndex(0)
  }

  const source = image.sourceRef
    ? candidate.sources.find((item) => item.ref === image.sourceRef)
    : undefined

  return (
    <div
      className={`relative overflow-hidden bg-black/4 ${compact ? 'h-180 rounded-12' : 'h-248 md:h-292'}`}
    >
      <AnimatePresence initial={false} mode="popLayout">
        <m.img
          key={image.url}
          alt={image.alt}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 size-full object-cover outline-1 -outline-offset-1 outline-black/10"
          exit={{ opacity: 0, scale: reducedMotion ? 1 : 1.02 }}
          initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.985 }}
          loading="lazy"
          src={image.url}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          onError={handleImageError}
        />
      </AnimatePresence>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-10 pt-32">
        <div className="flex items-center gap-5 rounded-full bg-white/92 px-9 py-5 font-mono text-mono-x-small text-accent-black">
          <span>
            {usableImages.length} photo{usableImages.length === 1 ? '' : 's'}
          </span>
          {source ? (
            <>
              <span aria-hidden className="text-foreground-muted">
                ·
              </span>
              <a
                className="max-w-132 truncate underline decoration-black/20 underline-offset-2 hover:decoration-black/60"
                href={source.url}
                rel="noreferrer"
                target="_blank"
              >
                {source.label}
              </a>
            </>
          ) : null}
        </div>
        {usableImages.length > 1 ? (
          <div className="flex gap-6">
            <MediaButton label="Previous photo" onClick={() => move(-1)}>
              <ArrowIcon direction="left" />
            </MediaButton>
            <MediaButton label="Next photo" onClick={() => move(1)}>
              <ArrowIcon direction="right" />
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
  readonly children: ReactNode
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

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg aria-hidden className="size-18" viewBox="0 0 18 18">
      <path
        d={
          direction === 'left'
            ? 'm10.75 4.5-4.5 4.5 4.5 4.5'
            : 'm7.25 4.5 4.5 4.5-4.5 4.5'
        }
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}
