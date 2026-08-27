import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { Candidate } from '../candidates'
import { euros } from '../candidates'
import { CheckIcon, PlusIcon, RouteIcon } from '../icons'
import { revealTransition, settleTransition, travel } from '../motion'
import { EvidenceMeter, StatusDot, claimWord } from '../primitives'
import type { VariantProps } from '../variantContract'

/**
 * Slats. Opening a candidate normally costs you the others. Here the set stays
 * on screen and only the width changes, so nothing is ever recalled from
 * memory: the comparison you were making survives the inspection.
 */
export function SlatWall({
  candidates,
  focusedId,
  onFocus,
  savedIds,
  onToggleSave,
}: VariantProps) {
  const step = (direction: -1 | 1) => {
    const index = candidates.findIndex((entry) => entry.id === focusedId)
    const next =
      candidates[(index + direction + candidates.length) % candidates.length]
    if (next) onFocus(next.id)
  }

  return (
    <div className="flex h-440 gap-4 overflow-hidden rounded-16 bg-accent-black p-4">
      {candidates.map((candidate) => (
        <Slat
          key={candidate.id}
          candidate={candidate}
          isOpen={candidate.id === focusedId}
          isSaved={savedIds.includes(candidate.id)}
          onOpen={() => onFocus(candidate.id)}
          onStep={step}
          onToggleSave={() => onToggleSave(candidate.id)}
        />
      ))}
    </div>
  )
}

interface SlatProps {
  readonly candidate: Candidate
  readonly isOpen: boolean
  readonly isSaved: boolean
  readonly onOpen: () => void
  readonly onStep: (direction: -1 | 1) => void
  readonly onToggleSave: () => void
}

function Slat({
  candidate,
  isOpen,
  isSaved,
  onOpen,
  onStep,
  onToggleSave,
}: SlatProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.section
      aria-current={isOpen}
      className="relative min-w-64 overflow-hidden rounded-12 bg-black/40"
      layout
      style={{ flexGrow: isOpen ? 10 : 1, flexBasis: 0 }}
      transition={settleTransition}
    >
      <motion.img
        alt={isOpen ? candidate.imageAlt : ''}
        className="absolute inset-0 size-full object-cover"
        draggable={false}
        layout
        src={candidate.imageUrl}
        transition={settleTransition}
      />
      <span
        aria-hidden="true"
        className={`absolute inset-0 ${
          isOpen
            ? 'bg-gradient-to-t from-black/88 via-black/58 to-black/18'
            : 'bg-black/58'
        }`}
      />

      <button
        className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-3 focus-visible:outline-heat-100"
        onClick={onOpen}
        onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
          event.preventDefault()
          onStep(event.key === 'ArrowRight' ? 1 : -1)
        }}
        type="button"
      >
        <span className="sr-only">
          {isOpen ? `${candidate.name}, open` : `Open ${candidate.name}`}
        </span>
      </button>

      <AnimatePresence initial={false} mode="wait">
        {isOpen ? (
          <motion.div
            key="open"
            animate={{ opacity: 1 }}
            className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end p-18"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={revealTransition}
          >
            <SlatDetail
              candidate={candidate}
              isSaved={isSaved}
              prefersReducedMotion={prefersReducedMotion}
              onToggleSave={onToggleSave}
            />
          </motion.div>
        ) : (
          <motion.div
            key="closed"
            animate={{ opacity: 1 }}
            className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-between py-14"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            transition={revealTransition}
          >
            <EvidenceMeter candidate={candidate} className="w-30" />
            <span
              className="text-label-small whitespace-nowrap text-white/88"
              style={{ writingMode: 'vertical-rl' }}
            >
              {candidate.name}
            </span>
            <span className="font-mono text-mono-x-small whitespace-nowrap text-white/72">
              {euros(candidate.allIn)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

function SlatDetail({
  candidate,
  isSaved,
  prefersReducedMotion,
  onToggleSave,
}: {
  readonly candidate: Candidate
  readonly isSaved: boolean
  readonly prefersReducedMotion: boolean | null
  readonly onToggleSave: () => void
}) {
  return (
    <motion.div
      animate="visible"
      className="min-w-260 text-white"
      initial="hidden"
      transition={{ delayChildren: 0.05, staggerChildren: 0.04 }}
    >
      <Rise prefersReducedMotion={prefersReducedMotion}>
        <div className="flex items-end justify-between gap-16">
          <div className="min-w-0">
            <h3 className="truncate text-title-h5">{candidate.name}</h3>
            <p className="truncate text-body-small text-white/72">
              {candidate.area}
            </p>
          </div>
          <p className="shrink-0 font-mono text-mono-medium tabular-nums">
            {euros(candidate.allIn)}
          </p>
        </div>
      </Rise>

      <Rise prefersReducedMotion={prefersReducedMotion}>
        <ul className="mt-12 flex flex-wrap gap-6">
          {candidate.claims.map((claim) => (
            <li
              key={claim.requirement}
              className="flex items-center gap-6 rounded-full bg-black/44 px-10 py-5 backdrop-blur-[8px]"
            >
              <StatusDot className="size-6" status={claim.status} />
              <span className="text-label-x-small whitespace-nowrap text-white/88">
                {claim.requirement} · {claimWord[claim.status].toLowerCase()}
              </span>
            </li>
          ))}
        </ul>
      </Rise>

      <Rise prefersReducedMotion={prefersReducedMotion}>
        <div className="pointer-events-auto mt-14 flex items-center gap-10">
          <span className="flex items-center gap-6 text-body-small text-white/72">
            <RouteIcon className="size-14" />
            {candidate.commuteMinutes} min · {candidate.commuteLabel}
          </span>
          <motion.button
            className={`ml-auto flex min-h-34 items-center gap-8 rounded-10 px-12 text-label-small ${
              isSaved ? 'bg-white text-accent-black' : 'bg-heat-100 text-white'
            } focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white`}
            onClick={onToggleSave}
            type="button"
            whileTap={{ scale: 0.97 }}
          >
            {isSaved ? (
              <CheckIcon className="size-14" />
            ) : (
              <PlusIcon className="size-14" />
            )}
            {isSaved ? 'Shortlisted' : 'Shortlist'}
          </motion.button>
        </div>
      </Rise>
    </motion.div>
  )
}

function Rise({
  children,
  prefersReducedMotion,
}: {
  readonly children: ReactNode
  readonly prefersReducedMotion: boolean | null
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: travel(prefersReducedMotion, 10) },
        visible: { opacity: 1, y: 0, transition: revealTransition },
      }}
    >
      {children}
    </motion.div>
  )
}
