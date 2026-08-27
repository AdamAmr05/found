import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import type {
  Accommodation,
  AccommodationView,
  EvidenceSource,
  RequirementSignal,
} from './accommodation'
import { evidenceSources, requirementSignals } from './accommodation'
import { euros, relativeTime } from '../accommodation/artifact'
import {
  ArrowIcon,
  CheckIcon,
  ChevronIcon,
  PlusIcon,
  RouteIcon,
  SourceIcon,
} from './icons'

interface AccommodationCardProps {
  readonly accommodation: Accommodation
  readonly isSelected: boolean
  readonly isSaved: boolean
  readonly onSelect: () => void
  readonly onToggleSave: () => void
}

const views: readonly {
  readonly id: AccommodationView
  readonly label: string
}[] = [
  { id: 'glance', label: 'At a glance' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'decision', label: 'Decision' },
]

const signalStyles = {
  match: 'bg-accent-forest',
  mismatch: 'bg-accent-crimson',
  unconfirmed: 'bg-accent-honey',
} as const

const evidenceLabels = {
  conflict: 'Needs checking',
  missing: 'Not found',
  verified: 'Verified',
} as const

export function AccommodationCard({
  accommodation,
  isSelected,
  isSaved,
  onSelect,
  onToggleSave,
}: AccommodationCardProps) {
  const [activeImage, setActiveImage] = useState(0)
  const [view, setView] = useState<AccommodationView>('glance')
  const prefersReducedMotion = useReducedMotion()
  const { contentHeight, contentRef } = useMeasuredContent(view)

  const imageUrl = accommodation.imageUrls[activeImage]

  if (!imageUrl) {
    throw new Error(`Missing image ${activeImage} for ${accommodation.id}`)
  }

  const moveImage = (direction: -1 | 1) => {
    const imageCount = accommodation.imageUrls.length
    setActiveImage((current) => (current + direction + imageCount) % imageCount)
  }

  return (
    <article
      className={`overflow-hidden rounded-16 bg-white shadow-[0_0_0_1px_rgba(38,38,38,0.08),0_2px_4px_rgba(38,38,38,0.04),0_16px_44px_rgba(38,38,38,0.06)] ${
        isSelected ? 'ring-2 ring-heat-100 ring-offset-3' : ''
      }`}
    >
      <motion.div
        className="relative h-248 overflow-hidden bg-black/4 md:h-292"
        layoutId={`accommodation-media-${accommodation.id}`}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.img
            key={imageUrl}
            alt={accommodation.imageAlt}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 size-full object-cover outline-1 -outline-offset-1 outline-black/10"
            exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 1.025 }}
            initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.985 }}
            loading="lazy"
            src={imageUrl}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          />
        </AnimatePresence>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/46 to-transparent p-12 pb-32">
          <div className="backdrop-blur-8 rounded-full bg-white/92 px-10 py-6 font-mono text-mono-x-small text-accent-black">
            {accommodation.imageUrls.length} photos · source matched
          </div>
          <button
            aria-label={
              isSaved ? 'Remove from comparison' : 'Add to comparison'
            }
            aria-pressed={isSaved}
            className="grid aspect-square size-44 shrink-0 place-items-center rounded-full bg-white text-accent-black shadow-[0_1px_3px_rgba(38,38,38,0.14)] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 active:scale-[0.96]"
            onClick={onToggleSave}
            type="button"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {isSaved ? (
                <motion.span
                  key="saved"
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  className="grid size-26 place-items-center rounded-full bg-heat-100 text-white"
                  exit={{ opacity: 0, scale: 0.4, rotate: -12 }}
                  initial={{ opacity: 0, scale: 0.4, rotate: 12 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                >
                  <CheckIcon className="size-15" />
                </motion.span>
              ) : (
                <motion.span
                  key="add"
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  className="grid size-22 place-items-center"
                  exit={{ opacity: 0, scale: 0.4, rotate: 12 }}
                  initial={{ opacity: 0, scale: 0.4, rotate: -12 }}
                  transition={{ type: 'spring', stiffness: 520, damping: 28 }}
                >
                  <PlusIcon className="size-22" strokeWidth={1.9} />
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/58 to-transparent p-12 pt-36">
          <div className="flex gap-6">
            {accommodation.imageUrls.map((candidateImageUrl, index) => (
              <button
                key={candidateImageUrl}
                aria-label={`Show photo ${index + 1}`}
                aria-pressed={index === activeImage}
                className="grid size-28 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
                onClick={() => setActiveImage(index)}
                type="button"
              >
                <span
                  className={`h-5 rounded-full ${
                    index === activeImage ? 'w-22 bg-white' : 'w-5 bg-white/64'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="flex gap-6">
            <ImageButton direction="previous" onClick={() => moveImage(-1)} />
            <ImageButton direction="next" onClick={() => moveImage(1)} />
          </div>
        </div>
      </motion.div>

      <div className="p-18 md:p-20">
        <div className="flex items-start justify-between gap-20">
          <div>
            <button
              className="text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-heat-100"
              onClick={onSelect}
              type="button"
            >
              <motion.h2
                className="text-title-h5 text-balance"
                layoutId={`accommodation-title-${accommodation.id}`}
              >
                {accommodation.name}
              </motion.h2>
              <p className="mt-3 text-body-small text-foreground-muted">
                {accommodation.area} · {accommodation.city}
              </p>
            </button>
          </div>
          <div className="shrink-0 text-right">
            <motion.p
              className="font-mono text-mono-medium tabular-nums"
              layoutId={`accommodation-cost-${accommodation.id}`}
            >
              {euros(accommodation.allIn)}
            </motion.p>
            <p className="text-body-small text-foreground-muted">
              all in / month
            </p>
          </div>
        </div>

        <fieldset className="mt-18 grid grid-cols-3 rounded-8 bg-black/4 p-3">
          <legend className="sr-only">Information view</legend>
          {views.map((candidate) => {
            const isActive = candidate.id === view

            return (
              <button
                key={candidate.id}
                aria-pressed={isActive}
                className="relative min-h-44 rounded-6 px-8 text-label-small focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 active:bg-black/6"
                onClick={() => setView(candidate.id)}
                type="button"
              >
                {isActive ? (
                  <motion.span
                    className="absolute inset-0 rounded-6 bg-white shadow-[0_1px_3px_rgba(38,38,38,0.1)]"
                    layoutId={`active-view-${accommodation.id}`}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 38,
                    }}
                  />
                ) : null}
                <span
                  className={`relative z-10 ${
                    isActive ? 'text-accent-black' : 'text-foreground-muted'
                  }`}
                >
                  {candidate.label}
                </span>
              </button>
            )
          })}
        </fieldset>

        <motion.div
          animate={{ height: contentHeight ?? 'auto' }}
          className="mt-18 overflow-hidden"
          data-testid={`accommodation-details-${accommodation.id}`}
          initial={false}
          transition={{ type: 'spring', stiffness: 340, damping: 36 }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={view}
              ref={contentRef}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: prefersReducedMotion ? 0 : -4,
                transition: { duration: 0.08 },
              }}
              initial={{
                opacity: 0,
                y: prefersReducedMotion ? 0 : 5,
              }}
              transition={{
                delay: prefersReducedMotion ? 0 : 0.06,
                duration: prefersReducedMotion ? 0.08 : 0.16,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <AccommodationDetails accommodation={accommodation} view={view} />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </article>
  )
}

function useMeasuredContent(view: AccommodationView) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return

    const measure = () =>
      setContentHeight(content.getBoundingClientRect().height)

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [view])

  return { contentHeight, contentRef }
}

function ImageButton({
  direction,
  onClick,
}: {
  readonly direction: 'next' | 'previous'
  readonly onClick: () => void
}) {
  const isNext = direction === 'next'

  return (
    <button
      aria-label={`${isNext ? 'Next' : 'Previous'} photo`}
      className="backdrop-blur-8 grid size-44 place-items-center rounded-full bg-white/92 text-accent-black transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white active:scale-[0.96]"
      onClick={onClick}
      type="button"
    >
      <ChevronIcon className={`size-16 ${isNext ? 'rotate-180' : ''}`} />
    </button>
  )
}

function AccommodationDetails({
  accommodation,
  view,
}: {
  readonly accommodation: Accommodation
  readonly view: AccommodationView
}) {
  switch (view) {
    case 'glance':
      return <GlanceDetails accommodation={accommodation} />
    case 'evidence':
      return <EvidenceDetails accommodation={accommodation} />
    case 'decision':
      return <DecisionDetails accommodation={accommodation} />
  }
}

function GlanceDetails({
  accommodation,
}: {
  readonly accommodation: Accommodation
}) {
  return (
    <div>
      <p className="text-body-medium text-pretty text-foreground-muted">
        {accommodation.headline} {accommodation.strongestMatch}.
      </p>
      <div className="mt-16 divide-y-1 divide-black/8">
        {requirementSignals(accommodation).map((fact) => (
          <SignalRow key={fact.label} signal={fact} />
        ))}
      </div>
    </div>
  )
}

function SignalRow({ signal }: { readonly signal: RequirementSignal }) {
  return (
    <div className="flex min-h-43 items-center justify-between gap-16 py-9">
      <div className="flex items-center gap-9">
        <span
          aria-hidden="true"
          className={`size-7 rounded-full ${signalStyles[signal.status]}`}
        />
        <span className="text-body-medium">{signal.label}</span>
      </div>
      <span className="text-right text-body-small text-foreground-muted tabular-nums">
        {signal.value}
      </span>
    </div>
  )
}

function EvidenceDetails({
  accommodation,
}: {
  readonly accommodation: Accommodation
}) {
  return (
    <div>
      <div className="flex items-center justify-between rounded-8 bg-heat-8 px-12 py-10">
        <div className="flex items-center gap-8">
          <SourceIcon className="size-16 text-heat-100" />
          <span className="text-label-small">
            {accommodation.sourceCount} sources connected
          </span>
        </div>
        <span className="font-mono text-mono-x-small text-foreground-muted">
          checked {relativeTime(accommodation.checkedMinutesAgo)}
        </span>
      </div>
      <div className="mt-10 divide-y-1 divide-black/8">
        {evidenceSources(accommodation).map((source) => (
          <EvidenceRow key={source.label} source={source} />
        ))}
      </div>
    </div>
  )
}

function EvidenceRow({ source }: { readonly source: EvidenceSource }) {
  return (
    <div
      className="grid grid-cols-[112px_1fr] gap-14 py-11"
      data-testid="evidence-row"
    >
      <div>
        <p className="text-label-small">{source.label}</p>
        <p
          className={`mt-1 font-mono text-mono-x-small ${
            source.status === 'verified'
              ? 'text-accent-forest'
              : 'text-accent-crimson'
          }`}
        >
          {evidenceLabels[source.status]}
        </p>
      </div>
      <p className="text-body-small text-pretty text-foreground-muted">
        {source.detail}
      </p>
    </div>
  )
}

function DecisionDetails({
  accommodation,
}: {
  readonly accommodation: Accommodation
}) {
  return (
    <div>
      <div className="grid grid-cols-3 divide-x-1 divide-black/8 rounded-8 bg-black/4 py-12">
        <DecisionMetric label="All in" value={euros(accommodation.allIn)} />
        <DecisionMetric label="Deposit" value={euros(accommodation.deposit)} />
        <DecisionMetric label="Move in" value={accommodation.availableFrom} />
      </div>
      <div className="mt-14 flex items-center gap-10 rounded-8 bg-accent-black p-12 text-white">
        <div className="grid size-38 shrink-0 place-items-center rounded-full bg-white/10">
          <RouteIcon className="size-17" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-label-small">
            {accommodation.commuteMinutes} minutes
          </p>
          <p className="truncate text-body-small text-white/56">
            {accommodation.commuteLabel}
          </p>
        </div>
      </div>
      <button
        className="mt-14 flex min-h-46 w-full items-center justify-between rounded-8 bg-heat-100 pr-12 pl-14 text-label-medium text-white shadow-[0_2px_6px_rgba(250,93,25,0.22)] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 active:scale-[0.99]"
        type="button"
      >
        Prepare questions for the landlord
        <ArrowIcon className="size-17" />
      </button>
    </div>
  )
}

function DecisionMetric({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="min-w-0 px-10">
      <p className="text-body-small text-foreground-muted">{label}</p>
      <p className="mt-3 truncate font-mono text-mono-small tabular-nums">
        {value}
      </p>
    </div>
  )
}
