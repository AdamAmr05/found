import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { RefObject } from 'react'
import { useRef, useState } from 'react'
import type { Candidate, CandidateId, Claim } from '../candidates'
import { euros, getCandidate } from '../candidates'
import { CloseIcon, LayersIcon } from '../icons'
import {
  revealTransition,
  settleTransition,
  snapTransition,
  travel,
} from '../motion'
import { Meta, StatusDot, claimText, claimWord } from '../primitives'
import type { VariantProps } from '../variantContract'

type SlotName = 'a' | 'b'

interface Slots {
  readonly a: CandidateId | null
  readonly b: CandidateId | null
}

interface ComparisonRow {
  readonly requirement: string
  readonly left: Claim
  readonly right: Claim
  readonly differs: boolean
}

/**
 * Merge. A comparison is not two cards side by side; it is the set of places
 * where two candidates stop agreeing. Dragging one onto another builds that
 * object, and the rows that disagree climb to the top rather than waiting to be
 * found. The chips stay clickable so the same move works without a pointer.
 */
export function CompareMerge({
  candidates,
  focusedId,
  onFocus,
  savedIds,
  onToggleSave,
}: VariantProps) {
  const [slots, setSlots] = useState<Slots>({ a: focusedId, b: null })
  const slotA = useRef<HTMLDivElement | null>(null)
  const slotB = useRef<HTMLDivElement | null>(null)

  /** One candidate cannot occupy both frames, so placing it vacates the other. */
  const place = (id: CandidateId, target: SlotName | null) => {
    setSlots((current) => {
      const name =
        target ?? (current.a === null || current.a === id ? 'a' : 'b')
      const other = current[name === 'a' ? 'b' : 'a']
      const kept = other === id ? null : other
      return name === 'a' ? { a: id, b: kept } : { a: kept, b: id }
    })
    onFocus(id)
  }

  const clear = (name: SlotName) =>
    setSlots((current) => ({ ...current, [name]: null }))

  const slotAt = (point: { readonly x: number; readonly y: number }) => {
    if (hits(slotA.current, point)) return 'a'
    if (hits(slotB.current, point)) return 'b'
    return null
  }

  const left = slots.a === null ? null : getCandidate(slots.a)
  const right = slots.b === null ? null : getCandidate(slots.b)

  return (
    <div>
      <div className="flex flex-wrap gap-6">
        {candidates.map((candidate) => (
          <DragChip
            key={candidate.id}
            candidate={candidate}
            isPlaced={slots.a === candidate.id || slots.b === candidate.id}
            onDrop={(point) => place(candidate.id, slotAt(point))}
          />
        ))}
      </div>
      <p className="mt-8 text-body-small text-foreground-muted">
        Drag two candidates into the frames, or click them.
      </p>

      <div className="mt-14 grid gap-10 sm:grid-cols-2">
        <Slot
          ref={slotA}
          candidate={left}
          label="First"
          onClear={() => clear('a')}
        />
        <Slot
          ref={slotB}
          candidate={right}
          label="Second"
          onClear={() => clear('b')}
        />
      </div>

      <AnimatePresence initial={false}>
        {left && right && left.id !== right.id ? (
          <ComparisonLedger
            key={`${left.id}-${right.id}`}
            left={left}
            right={right}
            savedIds={savedIds}
            onToggleSave={onToggleSave}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function hits(
  element: HTMLDivElement | null,
  point: { readonly x: number; readonly y: number },
): boolean {
  if (!element) return false
  const box = element.getBoundingClientRect()
  return (
    point.x >= box.left &&
    point.x <= box.right &&
    point.y >= box.top &&
    point.y <= box.bottom
  )
}

function DragChip({
  candidate,
  isPlaced,
  onDrop,
}: {
  readonly candidate: Candidate
  readonly isPlaced: boolean
  readonly onDrop: (point: { readonly x: number; readonly y: number }) => void
}) {
  return (
    <motion.button
      className={`flex min-h-40 cursor-grab items-center gap-8 rounded-8 px-10 text-label-small active:cursor-grabbing ${
        isPlaced
          ? 'bg-accent-black text-white'
          : 'bg-background-lighter text-accent-black shadow-[0_0_0_1px_rgb(38_38_38/0.1)]'
      } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100`}
      drag
      dragElastic={0.12}
      dragSnapToOrigin
      onClick={() => onDrop({ x: -1, y: -1 })}
      onDragEnd={(_event, info) => onDrop(info.point)}
      transition={snapTransition}
      type="button"
      whileDrag={{ scale: 1.06, zIndex: 60 }}
      whileTap={{ scale: 0.98 }}
    >
      <span
        aria-hidden="true"
        className="size-24 shrink-0 overflow-hidden rounded-6 bg-black/10"
      >
        <img
          alt=""
          className="size-full object-cover"
          draggable={false}
          src={candidate.imageUrl}
        />
      </span>
      {candidate.name}
    </motion.button>
  )
}

function Slot({
  candidate,
  label,
  onClear,
  ref,
}: {
  readonly candidate: Candidate | null
  readonly label: string
  readonly onClear: () => void
  readonly ref: RefObject<HTMLDivElement | null>
}) {
  return (
    <div
      ref={ref}
      className={`relative min-h-96 rounded-12 ${
        candidate
          ? 'bg-background-lighter shadow-[0_0_0_1px_rgb(38_38_38/0.09)]'
          : 'border-1 border-dashed border-border-loud'
      }`}
    >
      <AnimatePresence initial={false} mode="wait">
        {candidate ? (
          <motion.div
            key={candidate.id}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-12 p-12"
            exit={{ opacity: 0, scale: 0.97 }}
            initial={{ opacity: 0, scale: 0.97 }}
            transition={snapTransition}
          >
            <span className="size-64 shrink-0 overflow-hidden rounded-8 bg-black/8">
              <img
                alt={candidate.imageAlt}
                className="size-full object-cover"
                src={candidate.imageUrl}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-label-medium">{candidate.name}</p>
              <p className="truncate text-body-small text-foreground-muted">
                {candidate.area}
              </p>
              <p className="mt-4 font-mono text-mono-small tabular-nums">
                {euros(candidate.allIn)}
              </p>
            </div>
            <button
              aria-label={`Remove ${candidate.name}`}
              className="grid size-30 shrink-0 place-items-center self-start rounded-full bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
              onClick={onClear}
              type="button"
            >
              <CloseIcon className="size-14" />
            </button>
          </motion.div>
        ) : (
          <motion.p
            key="empty"
            animate={{ opacity: 1 }}
            className="absolute inset-0 grid place-items-center text-body-small text-foreground-muted"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={revealTransition}
          >
            {label} candidate
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

function ComparisonLedger({
  left,
  right,
  savedIds,
  onToggleSave,
}: {
  readonly left: Candidate
  readonly right: Candidate
  readonly savedIds: readonly CandidateId[]
  readonly onToggleSave: (id: CandidateId) => void
}) {
  const prefersReducedMotion = useReducedMotion()
  const rows = buildRows(left, right)
  const conflicts = rows.filter((row) => row.differs).length

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      aria-label={`${left.name} compared with ${right.name}`}
      className="mt-10 overflow-hidden rounded-12 bg-background-lighter shadow-[0_0_0_1px_rgb(38_38_38/0.09)]"
      exit={{ opacity: 0, y: travel(prefersReducedMotion, -6) }}
      initial={{ opacity: 0, y: travel(prefersReducedMotion, 8) }}
      transition={settleTransition}
    >
      <header className="flex items-center gap-8 border-b-1 border-border-faint px-14 py-10">
        <LayersIcon className="size-15 text-heat-100" />
        <p className="text-label-small">
          {conflicts === 0
            ? 'These two agree on every requirement'
            : `${conflicts} requirement${conflicts === 1 ? '' : 's'} where they diverge`}
        </p>
        <Meta>· divergences first</Meta>
      </header>

      <ul className="px-14 py-4">
        {rows.map((row) => (
          <motion.li
            key={row.requirement}
            className="grid grid-cols-[1fr_1fr] gap-12 border-b-1 border-border-faint py-10 last:border-b-0"
            layout
            transition={settleTransition}
          >
            <motion.div
              className="col-span-2 flex items-center gap-8"
              layout="position"
            >
              {row.differs ? (
                <span
                  aria-hidden="true"
                  className="h-12 w-3 shrink-0 rounded-full bg-heat-100"
                />
              ) : (
                <span aria-hidden="true" className="h-12 w-3 shrink-0" />
              )}
              <span className="text-label-small">{row.requirement}</span>
            </motion.div>
            <ComparisonCell claim={row.left} differs={row.differs} />
            <ComparisonCell claim={row.right} differs={row.differs} />
          </motion.li>
        ))}
      </ul>

      <footer className="flex flex-wrap items-center gap-8 border-t-1 border-border-faint px-14 py-10">
        {[left, right].map((candidate) => (
          <motion.button
            key={candidate.id}
            className={`flex min-h-32 items-center gap-8 rounded-8 px-10 text-label-x-small ${
              savedIds.includes(candidate.id)
                ? 'bg-accent-black text-white'
                : 'bg-black/5'
            } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100`}
            onClick={() => onToggleSave(candidate.id)}
            type="button"
            whileTap={{ scale: 0.97 }}
          >
            {savedIds.includes(candidate.id) ? 'Remove' : 'Shortlist'}{' '}
            {candidate.name}
          </motion.button>
        ))}
      </footer>
    </motion.section>
  )
}

function ComparisonCell({
  claim,
  differs,
}: {
  readonly claim: Claim
  readonly differs: boolean
}) {
  return (
    <div
      className={`rounded-8 px-10 py-8 ${differs ? 'bg-heat-4' : 'bg-black/3'}`}
    >
      <p className="text-body-small">{claim.confirmed ?? claim.claimed}</p>
      <p className="mt-3 flex items-center gap-6">
        <StatusDot className="size-6" status={claim.status} />
        <span className={`text-label-x-small ${claimText[claim.status]}`}>
          {claimWord[claim.status]}
        </span>
      </p>
      <Meta>{claim.provenance}</Meta>
    </div>
  )
}

function buildRows(
  left: Candidate,
  right: Candidate,
): readonly ComparisonRow[] {
  const rows = left.claims.flatMap((leftClaim) => {
    const rightClaim = right.claims.find(
      (entry) => entry.requirement === leftClaim.requirement,
    )
    if (!rightClaim) return []

    return [
      {
        requirement: leftClaim.requirement,
        left: leftClaim,
        right: rightClaim,
        differs: leftClaim.status !== rightClaim.status,
      },
    ]
  })

  return [...rows].sort((a, b) => Number(b.differs) - Number(a.differs))
}
