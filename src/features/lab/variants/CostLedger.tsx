import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import type { Candidate, CandidateId, CostConfidence } from '../candidates'
import { euros } from '../candidates'
import { useCeiling } from '../requirements'
import { CheckIcon, PlusIcon } from '../icons'
import { revealTransition, settleTransition, travel } from '../motion'
import { FocusRing, Meta } from '../primitives'
import type { VariantProps } from '../variantContract'

/** Segments separate by this much when a row opens, so the split reads as motion. */
const splitGap = 3

/**
 * The ceiling line is drawn once for the whole ledger, so it has to land on the
 * same axis the row bars use. These are the only source of both measurements.
 */
const nameColumn = 172
const costColumn = 88
const rowPadding = 8
const columnGap = 12
const trackInset = {
  left: rowPadding + nameColumn + columnGap,
  right: rowPadding + costColumn + columnGap,
}

const confidenceFill = {
  confirmed: 'bg-accent-black',
  estimated: 'bg-accent-honey',
  missing: 'bg-accent-crimson',
} satisfies Record<CostConfidence, string>

const confidenceWord = {
  confirmed: 'confirmed',
  estimated: 'estimated',
  missing: 'never itemised',
} satisfies Record<CostConfidence, string>

/**
 * Ledger. Cost is the requirement people actually decide on, so it gets the
 * only shared axis in the study. The ceiling is a single line drawn through
 * every row; crossing it is a spatial fact rather than a number to compare.
 * Opening a row splits the bar into what the cost is actually made of.
 */
export function CostLedger({
  candidates,
  focusedId,
  onFocus,
  savedIds,
  onToggleSave,
}: VariantProps) {
  const [openId, setOpenId] = useState<CandidateId | null>(focusedId)
  const ceiling = useCeiling()
  const axisMax = Math.max(...candidates.map((entry) => entry.allIn)) * 1.16
  const ordered = [...candidates].sort((a, b) => a.allIn - b.allIn)
  const ceilingPercent = (ceiling / axisMax) * 100

  return (
    <section
      aria-label="Candidates on one cost axis"
      className="relative rounded-16 bg-background-lighter p-16 shadow-[0_0_0_1px_rgb(38_38_38/0.07)]"
    >
      <header className="mb-12 flex items-baseline justify-between">
        <p className="text-label-medium">All-in monthly cost</p>
        <Meta>sorted low to high · {candidates.length} candidates</Meta>
      </header>

      <div className="relative">
        <CeilingLine percent={ceilingPercent} />

        <ul className="relative z-10 flex flex-col gap-2">
          {ordered.map((candidate) => (
            <li key={candidate.id}>
              <LedgerRow
                axisMax={axisMax}
                candidate={candidate}
                ceilingPercent={ceilingPercent}
                isFocused={candidate.id === focusedId}
                isOpen={openId === candidate.id}
                isSaved={savedIds.includes(candidate.id)}
                onOpen={() => {
                  setOpenId(openId === candidate.id ? null : candidate.id)
                  onFocus(candidate.id)
                }}
                onToggleSave={() => onToggleSave(candidate.id)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/** The line the product is named after. It belongs to the axis, not to a row. */
function CeilingLine({ percent }: { readonly percent: number }) {
  const ceiling = useCeiling()

  return (
    <div
      aria-hidden="true"
      className="absolute inset-y-0 z-0 hidden w-1 bg-heat-100/40 sm:block"
      style={{
        left: `calc(${trackInset.left}px + (100% - ${trackInset.left + trackInset.right}px) * ${percent / 100})`,
      }}
    >
      <span className="absolute -top-2 left-8 rounded-full bg-heat-8 px-8 py-2 font-mono text-mono-x-small whitespace-nowrap text-heat-100">
        ceiling {euros(ceiling)}
      </span>
    </div>
  )
}

interface LedgerRowProps {
  readonly axisMax: number
  readonly candidate: Candidate
  readonly ceilingPercent: number
  readonly isFocused: boolean
  readonly isOpen: boolean
  readonly isSaved: boolean
  readonly onOpen: () => void
  readonly onToggleSave: () => void
}

function LedgerRow({
  axisMax,
  candidate,
  ceilingPercent,
  isFocused,
  isOpen,
  isSaved,
  onOpen,
  onToggleSave,
}: LedgerRowProps) {
  const prefersReducedMotion = useReducedMotion()
  const ceiling = useCeiling()
  const isOver = candidate.allIn > ceiling

  return (
    <motion.div
      className={`relative rounded-10 ${isOpen ? 'bg-black/3' : ''}`}
      layout
      transition={settleTransition}
    >
      {isFocused ? <FocusRing radius={10} /> : null}
      <button
        aria-expanded={isOpen}
        className="flex w-full items-center gap-12 rounded-10 px-8 py-10 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-heat-100"
        onClick={onOpen}
        type="button"
      >
        <span className="relative shrink-0 pl-10" style={{ width: nameColumn }}>
          <span className="block truncate text-label-small">
            {candidate.name}
          </span>
          <span className="block truncate text-label-x-small text-foreground-muted">
            {candidate.area}
          </span>
        </span>

        <span className="relative h-10 min-w-0 flex-1">
          {candidate.costLines.map((line, index) => (
            <CostSegment
              key={line.label}
              axisMax={axisMax}
              index={index}
              isLast={index === candidate.costLines.length - 1}
              isOpen={isOpen}
              line={line}
              offsetAmount={sumBefore(candidate, index)}
            />
          ))}
          {isOver ? (
            <OverrunRule
              end={(candidate.allIn / axisMax) * 100}
              start={ceilingPercent}
            />
          ) : null}
        </span>

        <span className="shrink-0 text-right" style={{ width: costColumn }}>
          <span className="block font-mono text-mono-small tabular-nums">
            {euros(candidate.allIn)}
          </span>
          <span
            className={`block text-label-x-small ${
              isOver ? 'text-accent-crimson' : 'text-accent-forest'
            }`}
          >
            {isOver ? `+${euros(candidate.allIn - ceiling)}` : 'within'}
          </span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="breakdown"
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={settleTransition}
          >
            <div className="flex flex-wrap items-center gap-x-16 gap-y-8 px-18 pt-2 pb-12">
              {candidate.costLines.map((line, index) => (
                <motion.span
                  key={line.label}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-baseline gap-6"
                  initial={{
                    opacity: 0,
                    y: travel(prefersReducedMotion, 4),
                  }}
                  transition={{
                    ...revealTransition,
                    delay: 0.04 + index * 0.04,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={`size-7 shrink-0 translate-y-[-1px] rounded-full ${confidenceFill[line.confidence]}`}
                  />
                  <span className="text-body-small">{line.label}</span>
                  <span className="font-mono text-mono-x-small tabular-nums">
                    {euros(line.amount)}
                  </span>
                  <Meta>{confidenceWord[line.confidence]}</Meta>
                </motion.span>
              ))}

              <motion.button
                animate={{ opacity: 1 }}
                className={`ml-auto flex min-h-30 items-center gap-6 rounded-8 px-10 text-label-x-small ${
                  isSaved ? 'bg-accent-black text-white' : 'bg-black/5'
                } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100`}
                initial={{ opacity: 0 }}
                onClick={onToggleSave}
                transition={revealTransition}
                type="button"
                whileTap={{ scale: 0.97 }}
              >
                {isSaved ? (
                  <CheckIcon className="size-13" />
                ) : (
                  <PlusIcon className="size-13" />
                )}
                {isSaved ? 'Shortlisted' : 'Shortlist'}
              </motion.button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

function CostSegment({
  axisMax,
  index,
  isLast,
  isOpen,
  line,
  offsetAmount,
}: {
  readonly axisMax: number
  readonly index: number
  readonly isLast: boolean
  readonly isOpen: boolean
  readonly line: Candidate['costLines'][number]
  readonly offsetAmount: number
}) {
  /* Only the outer ends of the bar are capped, so an inner segment never reads
     as a loose dot sitting next to the bar. */
  const corners = `${index === 0 ? 'rounded-l-full' : ''} ${isLast ? 'rounded-r-full' : ''}`

  return (
    <motion.span
      animate={{ x: isOpen ? index * splitGap : 0, scaleX: 1 }}
      className={`absolute inset-y-0 rounded-2 ${corners} ${
        isOpen ? confidenceFill[line.confidence] : 'bg-accent-black'
      }`}
      initial={{ scaleX: 0, x: 0 }}
      style={{
        left: `${(offsetAmount / axisMax) * 100}%`,
        width: `calc(${(line.amount / axisMax) * 100}% - 1px)`,
        originX: 0,
      }}
      transition={settleTransition}
    />
  )
}

/**
 * The part of the bar that is past the ceiling, drawn under the segments rather
 * than over them so the cost breakdown stays readable while the overrun is
 * still impossible to miss.
 */
function OverrunRule({
  end,
  start,
}: {
  readonly end: number
  readonly start: number
}) {
  return (
    <motion.span
      animate={{ scaleX: 1, opacity: 1 }}
      aria-hidden="true"
      className="absolute -bottom-5 h-3 rounded-full bg-accent-crimson"
      initial={{ scaleX: 0, opacity: 0 }}
      style={{ left: `${start}%`, width: `${end - start}%`, originX: 0 }}
      transition={settleTransition}
    />
  )
}

function sumBefore(candidate: Candidate, index: number): number {
  return candidate.costLines
    .slice(0, index)
    .reduce((total, line) => total + line.amount, 0)
}
