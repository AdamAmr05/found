import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import { CandidateImageFallback } from './CandidateImageFallback'
import type {
  CandidateImage,
  RenderableCandidate,
} from './candidateMediaCatalog'

interface CandidateMediaProps {
  readonly candidate: RenderableCandidate
  readonly compact?: boolean
  readonly layoutId?: string
}

export function CandidateMedia({
  candidate,
  compact = false,
  layoutId,
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
      <m.div
        className={compact ? 'h-196 rounded-12' : 'h-248 md:h-292'}
        data-testid="candidate-media"
        transition={{ duration: reducedMotion ? 0 : 0.34 }}
        {...(layoutId ? { layoutId } : {})}
      >
        <CandidateImageFallback compact={compact} />
      </m.div>
    )
  }

  const move = (direction: -1 | 1) => {
    const count = usableImages.length
    setActiveIndex((safeIndex + direction + count) % count)
  }

  const handleImageError = (): void => {
    setFailedUrls((current) => new Set([...current, image.url]))
    const finalSurvivorIndex = Math.max(0, usableImages.length - 2)
    setActiveIndex(Math.min(safeIndex, finalSurvivorIndex))
  }

  const source = image.sourceRef
    ? candidate.sources.find((item) => item.ref === image.sourceRef)
    : undefined

  return (
    <m.div
      className={`relative overflow-hidden bg-black/4 ${compact ? 'h-196 rounded-12' : 'h-248 md:h-292'}`}
      data-testid="candidate-media"
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: 'spring', bounce: 0, duration: 0.34 }
      }
      {...(layoutId ? { layoutId } : {})}
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
      <MediaSourceBadge count={usableImages.length} source={source} />
      <GalleryControls
        activeIndex={safeIndex}
        images={usableImages}
        onMove={move}
        onSelect={setActiveIndex}
      />
    </m.div>
  )
}

function MediaSourceBadge({
  count,
  source,
}: {
  readonly count: number
  readonly source: RenderableCandidate['sources'][number] | undefined
}) {
  return (
    <div className="absolute inset-x-0 top-0 flex items-start bg-gradient-to-b from-black/42 to-transparent p-10 pb-32">
      <div className="backdrop-blur-8 flex items-center gap-5 rounded-full bg-white/92 px-9 py-5 font-mono text-mono-x-small text-accent-black">
        <span>
          {count} photo{count === 1 ? '' : 's'}
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
    </div>
  )
}

function GalleryControls({
  activeIndex,
  images,
  onMove,
  onSelect,
}: {
  readonly activeIndex: number
  readonly images: readonly CandidateImage[]
  readonly onMove: (direction: -1 | 1) => void
  readonly onSelect: (index: number) => void
}) {
  if (images.length <= 1) return null

  return (
    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-10 pt-32">
      <div className="flex gap-4">
        {images.map((item, index) => (
          <button
            key={item.url}
            aria-label={`Show photo ${index + 1}`}
            aria-pressed={index === activeIndex}
            className="grid size-24 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
            type="button"
            onClick={() => onSelect(index)}
          >
            <span
              className={`h-4 rounded-full transition-[width,background-color] duration-150 ${
                index === activeIndex ? 'w-18 bg-white' : 'w-4 bg-white/64'
              }`}
            />
          </button>
        ))}
      </div>
      <div className="flex gap-6">
        <MediaButton label="Previous photo" onClick={() => onMove(-1)}>
          <ArrowIcon direction="left" />
        </MediaButton>
        <MediaButton label="Next photo" onClick={() => onMove(1)}>
          <ArrowIcon direction="right" />
        </MediaButton>
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
