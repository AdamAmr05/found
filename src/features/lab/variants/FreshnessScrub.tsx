import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
} from 'motion/react'
import type { MotionValue } from 'motion/react'
import type { RefObject } from 'react'
import { useRef, useState } from 'react'
import type { Candidate, Claim } from '../candidates'
import { relativeTime } from '../candidates'
import { GripIcon } from '../icons'
import { releaseTransition, snapTransition } from '../motion'
import { FocusRing, Meta, claimFill } from '../primitives'
import type { VariantProps } from '../variantContract'

/** Three days back. Older evidence is drawn at the far edge rather than clipped. */
const horizonMinutes = 4320

/**
 * Freshness. Every other variant quietly presents what the system knows *now*
 * as if it were simply true. Dragging the handle back asks a different
 * question: at that moment, how much of this did you actually know? Facts that
 * had not been read yet hollow out, and a shortlist built on nine-minute-old
 * evidence starts to look different from one built on three-day-old evidence.
 */
export function FreshnessScrub({
  candidates,
  focusedId,
  onFocus,
}: VariantProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const trackWidth = useRef(0)
  const handleX = useMotionValue(0)
  const boundaries = evidenceBoundaries(candidates)
  const [asOfMinutes, setAsOfMinutes] = useState(0)

  /* The committed reading is mirrored in a ref because both the animation frame
     loop and repeated key presses read it between renders, and a render-scoped
     copy would be one step behind in each case. */
  const committed = useRef(0)
  const commit = (minutes: number) => {
    if (minutes === committed.current) return
    committed.current = minutes
    setAsOfMinutes(minutes)
  }

  /* The listener exists to translate a gesture, so it only reads while one is
     happening. Letting it run during a programmatic animation would let the
     handle's own travel overwrite the reading it was animating towards. */
  const isDragging = useRef(false)

  useMotionValueEvent(handleX, 'change', (value) => {
    if (!isDragging.current || trackWidth.current === 0) return
    const fraction = Math.min(1, Math.max(0, -value / trackWidth.current))
    commit(nearestBoundary(boundaries, minutesAt(fraction)))
  })

  const measure = () => {
    const box = trackRef.current?.getBoundingClientRect()
    trackWidth.current = box ? box.width : 0
  }

  const beginScrub = () => {
    measure()
    isDragging.current = true
  }

  /* Releasing settles on the moment a source actually landed, so the handle
     always comes to rest on the reading it is reporting. */
  const endScrub = () => {
    isDragging.current = false
    void animate(
      handleX,
      -fractionAt(committed.current) * trackWidth.current,
      releaseTransition,
    )
  }

  const stepTo = (direction: -1 | 1) => {
    measure()
    const index = boundaries.indexOf(committed.current)
    const next =
      boundaries[
        Math.min(boundaries.length - 1, Math.max(0, index + direction))
      ]
    if (next === undefined) return
    commit(next)
    void animate(
      handleX,
      -fractionAt(next) * trackWidth.current,
      releaseTransition,
    )
  }

  const totals = countKnown(candidates, asOfMinutes)

  return (
    <section
      aria-label="What was known, and when"
      className="rounded-16 bg-background-lighter p-16 shadow-[0_0_0_1px_rgb(38_38_38/0.07)]"
    >
      <header className="mb-14 flex flex-wrap items-baseline gap-x-12 gap-y-4">
        <p className="text-label-medium">
          {asOfMinutes === 0
            ? 'Everything known now'
            : `As of ${relativeTime(asOfMinutes)}`}
        </p>
        <p aria-live="polite" className="text-body-small text-foreground-muted">
          {totals.known} of {totals.total} sources had been read
        </p>
        <Meta>· drag the handle back through the evidence</Meta>
      </header>

      <div className="relative" ref={trackRef}>
        <ul className="flex flex-col gap-2">
          {candidates.map((candidate) => (
            <li key={candidate.id}>
              <FreshnessRow
                asOfMinutes={asOfMinutes}
                candidate={candidate}
                isFocused={candidate.id === focusedId}
                onFocus={() => onFocus(candidate.id)}
              />
            </li>
          ))}
        </ul>

        <ScrubHandle
          handleX={handleX}
          onScrubEnd={endScrub}
          onScrubStart={beginScrub}
          onStep={stepTo}
          trackRef={trackRef}
        />
      </div>

      <div className="mt-10 flex justify-between px-4">
        <Meta>three days ago</Meta>
        <Meta>now</Meta>
      </div>
    </section>
  )
}

function ScrubHandle({
  handleX,
  onScrubEnd,
  onScrubStart,
  onStep,
  trackRef,
}: {
  readonly handleX: MotionValue<number>
  readonly onScrubEnd: () => void
  readonly onScrubStart: () => void
  readonly onStep: (direction: -1 | 1) => void
  readonly trackRef: RefObject<HTMLDivElement | null>
}) {
  return (
    <motion.button
      aria-label="Rewind the evidence"
      className="absolute inset-y-0 right-0 z-30 grid w-28 cursor-grab place-items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 active:cursor-grabbing"
      drag="x"
      dragConstraints={trackRef}
      dragElastic={0.02}
      dragMomentum={false}
      onDragEnd={onScrubEnd}
      onDragStart={onScrubStart}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        onStep(event.key === 'ArrowLeft' ? 1 : -1)
      }}
      style={{ x: handleX }}
      type="button"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-heat-100/44"
      />
      <span className="relative grid h-52 w-22 place-items-center rounded-full bg-background-lighter text-accent-black shadow-[0_0_0_1px_rgb(38_38_38/0.12),0_2px_8px_rgb(38_38_38/0.16)]">
        <GripIcon className="size-14" />
      </span>
    </motion.button>
  )
}

function FreshnessRow({
  asOfMinutes,
  candidate,
  isFocused,
  onFocus,
}: {
  readonly asOfMinutes: number
  readonly candidate: Candidate
  readonly isFocused: boolean
  readonly onFocus: () => void
}) {
  const known = candidate.claims.filter((claim) =>
    isKnownAt(claim, asOfMinutes),
  ).length

  return (
    <div className="relative rounded-10">
      {isFocused ? <FocusRing radius={10} /> : null}
      <button
        className="flex w-full items-center gap-12 rounded-10 py-8 pr-40 pl-8 text-left hover:bg-black/3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-heat-100"
        onClick={onFocus}
        type="button"
      >
        <span className="w-152 shrink-0">
          <span className="block truncate text-label-small">
            {candidate.name}
          </span>
          <span className="block truncate text-label-x-small text-foreground-muted">
            {known === candidate.claims.length
              ? 'fully sourced'
              : `${known} of ${candidate.claims.length} sourced`}
          </span>
        </span>

        <span className="relative h-30 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-black/8"
          />
          {candidate.claims.map((claim) => (
            <EvidenceDot
              key={claim.requirement}
              claim={claim}
              isKnown={isKnownAt(claim, asOfMinutes)}
            />
          ))}
        </span>
      </button>
    </div>
  )
}

function EvidenceDot({
  claim,
  isKnown,
}: {
  readonly claim: Claim
  readonly isKnown: boolean
}) {
  const minutes = claim.verifiedMinutesAgo

  if (minutes === null) {
    return (
      <span
        className="absolute top-1/2 left-0 size-10 -translate-y-1/2 rounded-full border-1 border-dashed border-border-loud"
        title={`${claim.requirement}: no source found`}
      />
    )
  }

  return (
    <motion.span
      animate={{ opacity: isKnown ? 1 : 0.3, scale: isKnown ? 1 : 0.72 }}
      className={`absolute top-1/2 size-12 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background-lighter ${
        isKnown ? claimFill[claim.status] : 'bg-black/20'
      }`}
      initial={false}
      style={{ left: `${(1 - fractionAt(minutes)) * 100}%` }}
      title={`${claim.requirement}: read ${relativeTime(minutes)}`}
      transition={snapTransition}
    />
  )
}

/** A source counts as read only if it was read before the point being asked about. */
function isKnownAt(claim: Claim, asOfMinutes: number): boolean {
  return (
    claim.verifiedMinutesAgo !== null && claim.verifiedMinutesAgo >= asOfMinutes
  )
}

interface SourceTally {
  readonly known: number
  readonly total: number
}

function countKnown(
  candidates: readonly Candidate[],
  asOfMinutes: number,
): SourceTally {
  const claims = candidates.flatMap((candidate) => candidate.claims)
  return {
    known: claims.filter((claim) => isKnownAt(claim, asOfMinutes)).length,
    total: claims.length,
  }
}

/**
 * Evidence ages logarithmically in usefulness, so it is placed that way: the
 * last hour gets as much room as the two days before it.
 */
function fractionAt(minutes: number): number {
  const clamped = Math.min(horizonMinutes, Math.max(0, minutes))
  return Math.log1p(clamped) / Math.log1p(horizonMinutes)
}

function minutesAt(fraction: number): number {
  return Math.expm1(fraction * Math.log1p(horizonMinutes))
}

/** The moments a source actually landed. The handle reports these, not pixels. */
function evidenceBoundaries(
  candidates: readonly Candidate[],
): readonly number[] {
  const times = candidates
    .flatMap((candidate) => candidate.claims)
    .flatMap((claim) =>
      claim.verifiedMinutesAgo === null ? [] : [claim.verifiedMinutesAgo],
    )

  return [...new Set([0, ...times])].sort((a, b) => a - b)
}

function nearestBoundary(
  boundaries: readonly number[],
  minutes: number,
): number {
  return boundaries.reduce((best, candidate) =>
    Math.abs(candidate - minutes) < Math.abs(best - minutes) ? candidate : best,
  )
}
