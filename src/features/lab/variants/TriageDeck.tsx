import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import type { MotionValue } from 'motion/react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import type { Candidate, CandidateId } from '../candidates'
import { euros } from '../candidates'
import { AskIcon, CheckIcon, CloseIcon, UndoIcon } from '../icons'
import { releaseTransition, settleTransition, snapTransition } from '../motion'
import { EvidenceMeter, Meta } from '../primitives'
import type { VariantProps } from '../variantContract'

type Verdict = 'ask' | 'pass' | 'shortlist'

interface Decision {
  readonly id: CandidateId
  readonly verdict: Verdict
}

/** Gesture commits once the card has clearly left its resting position. */
const commitDistance = 128
const commitVelocity = 520
const visibleDepth = 3

const verdictCopy = {
  shortlist: 'Shortlisted',
  pass: 'Passed',
  ask: 'Sent to the agent',
} satisfies Record<Verdict, string>

/**
 * Deck. Six candidates is a pile, not a page. The gesture is the decision:
 * throw right to shortlist, left to pass, up to hand the open question back to
 * the agent. Every throw has a button and a key, and every throw is undoable,
 * because a triage surface that cannot be reversed stops being used.
 */
export function TriageDeck({
  candidates,
  onFocus,
  savedIds,
  onToggleSave,
}: VariantProps) {
  const [decisions, setDecisions] = useState<readonly Decision[]>([])
  const [lastVerdict, setLastVerdict] = useState<Verdict>('shortlist')
  const prefersReducedMotion = useReducedMotion()

  const remaining = candidates.slice(decisions.length)
  const top = remaining[0]

  const decide = (verdict: Verdict) => {
    if (!top) return

    setLastVerdict(verdict)
    setDecisions((current) => [...current, { id: top.id, verdict }])

    if (verdict === 'shortlist' && !savedIds.includes(top.id)) {
      onToggleSave(top.id)
    }

    const next = candidates[decisions.length + 1]
    if (next) onFocus(next.id)
  }

  const undo = () => {
    const previous = decisions.at(-1)
    if (!previous) return

    setDecisions((current) => current.slice(0, -1))
    if (previous.verdict === 'shortlist' && savedIds.includes(previous.id)) {
      onToggleSave(previous.id)
    }
    onFocus(previous.id)
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-420 w-full max-w-420">
        <AnimatePresence custom={lastVerdict} initial={false}>
          {remaining
            .slice(0, visibleDepth)
            .map((candidate, depth) => (
              <DeckCard
                key={candidate.id}
                candidate={candidate}
                depth={depth}
                onDecide={decide}
                prefersReducedMotion={prefersReducedMotion}
              />
            ))
            .reverse()}
        </AnimatePresence>

        {top ? null : (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 grid place-items-center rounded-16 border-1 border-dashed border-border-loud"
            initial={{ opacity: 0, scale: 0.97 }}
            transition={settleTransition}
          >
            <div className="px-24 text-center">
              <p className="text-label-large">The pile is clear.</p>
              <p className="mt-6 text-body-small text-foreground-muted">
                {
                  decisions.filter((entry) => entry.verdict === 'shortlist')
                    .length
                }{' '}
                shortlisted ·{' '}
                {decisions.filter((entry) => entry.verdict === 'ask').length}{' '}
                sent back to the agent
              </p>
            </div>
          </motion.div>
        )}
      </div>

      <div className="mt-20 flex items-center gap-10">
        <DeckAction
          label="Pass"
          onClick={() => decide('pass')}
          disabled={!top}
          tone="quiet"
        >
          <CloseIcon className="size-18" />
        </DeckAction>
        <DeckAction
          label="Ask the agent"
          onClick={() => decide('ask')}
          disabled={!top}
          tone="quiet"
        >
          <AskIcon className="size-18" />
        </DeckAction>
        <DeckAction
          label="Shortlist"
          onClick={() => decide('shortlist')}
          disabled={!top}
          tone="heat"
        >
          <CheckIcon className="size-18" />
        </DeckAction>
        <DeckAction
          label="Undo the last decision"
          onClick={undo}
          disabled={decisions.length === 0}
          tone="quiet"
        >
          <UndoIcon className="size-18" />
        </DeckAction>
      </div>

      <p
        aria-live="polite"
        className="mt-12 min-h-20 text-body-small text-foreground-muted"
      >
        {decisions.length === 0
          ? `${candidates.length} to triage · drag, or use the buttons`
          : `${verdictCopy[lastVerdict]} · ${remaining.length} left`}
      </p>
    </div>
  )
}

interface DeckCardProps {
  readonly candidate: Candidate
  readonly depth: number
  readonly prefersReducedMotion: boolean | null
  readonly onDecide: (verdict: Verdict) => void
}

function DeckCard({
  candidate,
  depth,
  prefersReducedMotion,
  onDecide,
}: DeckCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-260, 260], [-13, 13])
  const shortlistOpacity = useTransform(x, [40, 150], [0, 1])
  const passOpacity = useTransform(x, [-150, -40], [1, 0])
  const askOpacity = useTransform(y, [-150, -40], [1, 0])
  const isTop = depth === 0

  return (
    <motion.article
      animate={{
        scale: 1 - depth * 0.05,
        y: depth * 16,
        opacity: 1,
      }}
      className="absolute inset-0 overflow-hidden rounded-16 bg-background-lighter shadow-[0_0_0_1px_rgb(38_38_38/0.08),0_10px_30px_rgb(38_38_38/0.08)]"
      drag={isTop}
      dragElastic={0.5}
      exit="thrown"
      initial={{ scale: 1 - depth * 0.05, y: depth * 16, opacity: 0 }}
      onDragEnd={(_event, info) => {
        const verdict = verdictFor(info.offset, info.velocity)
        if (verdict) onDecide(verdict)
      }}
      style={{ x, y, rotate, zIndex: visibleDepth - depth }}
      transition={settleTransition}
      variants={{
        thrown: (verdict: Verdict) => exitFor(verdict, prefersReducedMotion),
      }}
      whileDrag={{ cursor: 'grabbing' }}
    >
      <div className="relative h-232 overflow-hidden bg-black/6">
        <img
          alt={candidate.imageAlt}
          className="size-full object-cover"
          draggable={false}
          src={candidate.imageUrl}
        />
        <VerdictStamp
          className="top-16 left-16 border-accent-forest text-accent-forest"
          label="Shortlist"
          opacity={shortlistOpacity}
        />
        <VerdictStamp
          className="top-16 right-16 border-accent-crimson text-accent-crimson"
          label="Pass"
          opacity={passOpacity}
        />
        <VerdictStamp
          className="right-16 bottom-16 left-16 justify-center border-accent-bluetron text-accent-bluetron"
          label="Ask the agent"
          opacity={askOpacity}
        />
      </div>

      <div className="p-16">
        <div className="flex items-start justify-between gap-14">
          <div className="min-w-0">
            <h3 className="truncate text-label-large">{candidate.name}</h3>
            <p className="truncate text-body-small text-foreground-muted">
              {candidate.area}
            </p>
          </div>
          <p className="shrink-0 font-mono text-mono-medium tabular-nums">
            {euros(candidate.allIn)}
          </p>
        </div>

        <div className="mt-14 rounded-8 bg-black/4 px-12 py-10">
          <p className="text-body-small">{candidate.strongestMatch}</p>
          <p className="mt-4 text-body-small text-accent-crimson">
            {candidate.openQuestion}
          </p>
        </div>

        <div className="mt-12 flex items-center gap-10">
          <EvidenceMeter candidate={candidate} className="w-72" />
          <Meta>{candidate.sourceCount} sources</Meta>
          <Meta>·</Meta>
          <Meta>{candidate.commuteMinutes} min</Meta>
        </div>
      </div>
    </motion.article>
  )
}

function VerdictStamp({
  className,
  label,
  opacity,
}: {
  readonly className: string
  readonly label: string
  readonly opacity: MotionValue<number>
}) {
  return (
    <motion.span
      aria-hidden="true"
      className={`absolute flex min-h-30 items-center rounded-8 border-2 bg-white/92 px-10 text-label-small ${className}`}
      style={{ opacity }}
    >
      {label}
    </motion.span>
  )
}

interface Vector {
  readonly x: number
  readonly y: number
}

function verdictFor(offset: Vector, velocity: Vector): Verdict | null {
  if (offset.y < -commitDistance || velocity.y < -commitVelocity) return 'ask'
  if (offset.x > commitDistance || velocity.x > commitVelocity)
    return 'shortlist'
  if (offset.x < -commitDistance || velocity.x < -commitVelocity) return 'pass'
  return null
}

function exitFor(verdict: Verdict, prefersReducedMotion: boolean | null) {
  if (prefersReducedMotion === true) {
    return { opacity: 0, transition: { duration: 0.12 } }
  }

  const flung = {
    shortlist: { x: 620, rotate: 22 },
    pass: { x: -620, rotate: -22 },
    ask: { y: -640, rotate: 0 },
  }[verdict]

  return { ...flung, opacity: 0, transition: releaseTransition }
}

function DeckAction({
  children,
  disabled,
  label,
  onClick,
  tone,
}: {
  readonly children: ReactNode
  readonly disabled: boolean
  readonly label: string
  readonly onClick: () => void
  readonly tone: 'heat' | 'quiet'
}) {
  return (
    <motion.button
      aria-label={label}
      className={`grid size-46 place-items-center rounded-full disabled:opacity-30 ${
        tone === 'heat'
          ? 'bg-heat-100 text-white shadow-[0_2px_8px_rgb(250_93_25/0.26)]'
          : 'bg-background-lighter text-accent-black shadow-[0_0_0_1px_rgb(38_38_38/0.1)]'
      } focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      transition={snapTransition}
      type="button"
      whileHover={{ y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.94 }}
    >
      {children}
    </motion.button>
  )
}
