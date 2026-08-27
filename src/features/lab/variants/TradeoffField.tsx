import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import type { Candidate } from '../candidates'
import { euros } from '../candidates'
import { useCeiling } from '../requirements'
import { CheckIcon, PlusIcon } from '../icons'
import { revealTransition, settleTransition, snapTransition } from '../motion'
import { EvidenceMeter, Meta } from '../primitives'
import type { VariantProps } from '../variantContract'

type FieldAxis = 'commute' | 'deposit' | 'openQuestions'

interface AxisDefinition {
  readonly id: FieldAxis
  readonly label: string
  readonly unit: string
  readonly valueOf: (candidate: Candidate) => number
}

/** Every axis is oriented so that less is better. The good corner is top left. */
const axes: readonly AxisDefinition[] = [
  {
    id: 'commute',
    label: 'Commute',
    unit: 'min',
    valueOf: (candidate) => candidate.commuteMinutes,
  },
  {
    id: 'deposit',
    label: 'Deposit',
    unit: '€',
    valueOf: (candidate) => candidate.deposit,
  },
  {
    id: 'openQuestions',
    label: 'Open questions',
    unit: 'left',
    valueOf: (candidate) =>
      candidate.claims.filter((claim) => claim.status !== 'confirmed').length,
  },
]

interface Plotted {
  readonly candidate: Candidate
  readonly x: number
  readonly y: number
  readonly left: number
  readonly top: number
  readonly dominatedBy: string | null
}

/**
 * Field. Sorting answers "which is best" one requirement at a time; it never
 * answers "which of these is simply worse than another one". Two axes and a
 * frontier do: anything above and right of the line is beaten outright by
 * something on it, and swapping an axis re-forms the argument in place.
 */
export function TradeoffField({
  candidates,
  focusedId,
  onFocus,
  savedIds,
  onToggleSave,
}: VariantProps) {
  const [axisId, setAxisId] = useState<FieldAxis>('commute')
  const axis = axes.find((entry) => entry.id === axisId) ?? axes[0]

  if (!axis) throw new Error('The tradeoff field has no axes')

  const plotted = plot(candidates, axis)
  const frontier = plotted.filter((entry) => entry.dominatedBy === null)
  const focused = plotted.find((entry) => entry.candidate.id === focusedId)

  return (
    <section
      aria-label="Cost against a second requirement"
      className="rounded-16 bg-background-lighter p-16 shadow-[0_0_0_1px_rgb(38_38_38/0.07)]"
    >
      <header className="mb-14 flex flex-wrap items-center gap-10">
        <p className="text-label-medium">All-in cost against</p>
        <fieldset className="flex gap-3 rounded-8 bg-black/4 p-3">
          <legend className="sr-only">Second axis</legend>
          {axes.map((entry) => {
            const isActive = entry.id === axisId

            return (
              <button
                key={entry.id}
                aria-pressed={isActive}
                className="relative min-h-30 rounded-6 px-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
                onClick={() => setAxisId(entry.id)}
                type="button"
              >
                {isActive ? (
                  <motion.span
                    className="absolute inset-0 rounded-6 bg-background-lighter shadow-[0_1px_3px_rgb(38_38_38/0.12)]"
                    layoutId="lab-field-axis"
                    transition={snapTransition}
                  />
                ) : null}
                <span
                  className={`relative z-10 text-label-small ${
                    isActive ? 'text-accent-black' : 'text-foreground-muted'
                  }`}
                >
                  {entry.label}
                </span>
              </button>
            )
          })}
        </fieldset>
        <Meta>· better is up and to the left</Meta>
      </header>

      <div className="relative h-360 rounded-12 bg-black/3">
        <CeilingBand candidates={candidates} />
        <Frontier axisId={axisId} points={frontier} />

        {plotted.map((entry) => (
          <PlotMarker
            key={entry.candidate.id}
            entry={entry}
            isFocused={entry.candidate.id === focusedId}
            onFocus={() => onFocus(entry.candidate.id)}
          />
        ))}

        <span className="absolute bottom-8 left-12 text-label-x-small text-foreground-muted">
          cheaper
        </span>
        <span className="absolute right-12 bottom-8 text-label-x-small text-foreground-muted">
          dearer
        </span>
        <span className="absolute top-10 left-12 text-label-x-small text-foreground-muted">
          less {axis.label.toLowerCase()}
        </span>
      </div>

      <AnimatePresence initial={false} mode="wait">
        {focused ? (
          <motion.div
            key={focused.candidate.id}
            animate={{ opacity: 1, y: 0 }}
            className="mt-14 flex flex-wrap items-center gap-12 rounded-10 bg-black/3 px-12 py-10"
            exit={{ opacity: 0, y: -4 }}
            initial={{ opacity: 0, y: 4 }}
            transition={revealTransition}
          >
            <span className="size-36 shrink-0 overflow-hidden rounded-8 bg-black/8">
              <img
                alt=""
                className="size-full object-cover"
                src={focused.candidate.imageUrl}
              />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-label-small">
                {focused.candidate.name}
              </span>
              <span className="block text-label-x-small text-foreground-muted">
                {euros(focused.candidate.allIn)} · {axis.label.toLowerCase()}{' '}
                {axis.valueOf(focused.candidate)} {axis.unit}
              </span>
            </span>
            <EvidenceMeter candidate={focused.candidate} className="w-64" />
            <p className="min-w-0 flex-1 text-body-small text-foreground-muted">
              {focused.dominatedBy === null
                ? 'On the frontier: nothing here beats it on both axes.'
                : `Beaten outright by ${focused.dominatedBy}.`}
            </p>
            <motion.button
              className={`flex min-h-32 shrink-0 items-center gap-6 rounded-8 px-10 text-label-x-small ${
                savedIds.includes(focused.candidate.id)
                  ? 'bg-accent-black text-white'
                  : 'bg-black/6'
              } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100`}
              onClick={() => onToggleSave(focused.candidate.id)}
              type="button"
              whileTap={{ scale: 0.97 }}
            >
              {savedIds.includes(focused.candidate.id) ? (
                <CheckIcon className="size-13" />
              ) : (
                <PlusIcon className="size-13" />
              )}
              {savedIds.includes(focused.candidate.id)
                ? 'Shortlisted'
                : 'Shortlist'}
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  )
}

function PlotMarker({
  entry,
  isFocused,
  onFocus,
}: {
  readonly entry: Plotted
  readonly isFocused: boolean
  readonly onFocus: () => void
}) {
  const isDominated = entry.dominatedBy !== null

  return (
    <motion.button
      /* Six nodes moving once per axis change, not a continuous gesture, so
         animating position directly is cheaper than measuring the container. */
      animate={{
        left: `${entry.left}%`,
        top: `${entry.top}%`,
        opacity: isDominated && !isFocused ? 0.44 : 1,
      }}
      aria-label={`${entry.candidate.name}, ${euros(entry.candidate.allIn)}`}
      aria-pressed={isFocused}
      className="absolute rounded-full focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100"
      onClick={onFocus}
      style={{ translateX: '-50%', translateY: '-50%' }}
      transition={settleTransition}
      type="button"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.span
        animate={{ scale: isFocused ? 1.18 : 1 }}
        className={`block overflow-hidden rounded-full bg-black/10 ${
          isFocused
            ? 'size-48 ring-2 ring-heat-100'
            : 'size-40 ring-1 ring-white/80'
        }`}
        transition={snapTransition}
      >
        <img
          alt=""
          className="size-full object-cover"
          draggable={false}
          src={entry.candidate.imageUrl}
        />
      </motion.span>
    </motion.button>
  )
}

/** Everything to the right of this line is over the stated ceiling. */
function CeilingBand({
  candidates,
}: {
  readonly candidates: readonly Candidate[]
}) {
  const ceiling = useCeiling()
  const costs = candidates.map((entry) => entry.allIn)
  const percent = normalise(ceiling, Math.min(...costs), Math.max(...costs))

  if (percent <= 0 || percent >= 100) return null

  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-y-0 z-0 bg-accent-crimson/4"
        style={{ left: `${percent}%`, right: 0 }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-y-0 z-0 w-1 bg-heat-100/40"
        style={{ left: `${percent}%` }}
      >
        <span className="absolute top-8 left-8 rounded-full bg-heat-8 px-8 py-2 font-mono text-mono-x-small whitespace-nowrap text-heat-100">
          {euros(ceiling)}
        </span>
      </span>
    </>
  )
}

function Frontier({
  axisId,
  points,
}: {
  readonly axisId: FieldAxis
  readonly points: readonly Plotted[]
}) {
  const ordered = [...points].sort((a, b) => a.left - b.left)

  if (ordered.length < 2) return null

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 z-0 size-full"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <motion.polyline
        key={axisId}
        animate={{ opacity: 1 }}
        fill="none"
        initial={{ opacity: 0 }}
        points={ordered.map((entry) => `${entry.left},${entry.top}`).join(' ')}
        stroke="rgb(38 38 38 / 0.22)"
        strokeDasharray="4 4"
        strokeWidth="1.5"
        transition={revealTransition}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** Padding keeps the outermost markers inside the plot rather than on its edge. */
const plotInset = 12

function plot(
  candidates: readonly Candidate[],
  axis: AxisDefinition,
): readonly Plotted[] {
  const costs = candidates.map((entry) => entry.allIn)
  const others = candidates.map((entry) => axis.valueOf(entry))
  const costRange = { low: Math.min(...costs), high: Math.max(...costs) }
  const otherRange = { low: Math.min(...others), high: Math.max(...others) }

  const placed = candidates.map((candidate) => {
    const x = candidate.allIn
    const y = axis.valueOf(candidate)

    return {
      candidate,
      x,
      y,
      left: inset(normalise(x, costRange.low, costRange.high)),
      top: inset(normalise(y, otherRange.low, otherRange.high)),
    }
  })

  return placed.map((entry) => ({
    ...entry,
    dominatedBy: dominatorOf(entry, placed),
  }))
}

function dominatorOf(
  entry: { readonly x: number; readonly y: number },
  all: readonly {
    readonly candidate: Candidate
    readonly x: number
    readonly y: number
  }[],
): string | null {
  const winner = all.find(
    (other) =>
      other.x <= entry.x &&
      other.y <= entry.y &&
      (other.x < entry.x || other.y < entry.y),
  )
  return winner ? winner.candidate.name : null
}

function normalise(value: number, low: number, high: number): number {
  return high === low ? 50 : ((value - low) / (high - low)) * 100
}

function inset(percent: number): number {
  return plotInset + (percent / 100) * (100 - plotInset * 2)
}
