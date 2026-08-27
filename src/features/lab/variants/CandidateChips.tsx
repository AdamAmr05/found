import { motion } from 'motion/react'
import type { Candidate, CandidateId } from '../candidates'
import { snapTransition } from '../motion'
import { EvidenceMeter } from '../primitives'

/**
 * Switching which candidate a single-object variant is showing. The active
 * background is one element that travels, so the eye follows the selection
 * instead of re-finding it.
 */
export function CandidateChips({
  candidates,
  focusedId,
  onFocus,
}: {
  readonly candidates: readonly Candidate[]
  readonly focusedId: CandidateId
  readonly onFocus: (id: CandidateId) => void
}) {
  return (
    <fieldset className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
      <legend className="sr-only">Candidate</legend>
      {candidates.map((candidate) => {
        const isActive = candidate.id === focusedId

        return (
          <button
            key={candidate.id}
            aria-pressed={isActive}
            className="relative min-h-40 shrink-0 rounded-8 px-12 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
            onClick={() => onFocus(candidate.id)}
            type="button"
          >
            {isActive ? (
              <motion.span
                className="absolute inset-0 rounded-8 bg-accent-black"
                layoutId="lab-chip-active"
                transition={snapTransition}
              />
            ) : null}
            <span className="relative z-10 flex items-center gap-9">
              <span
                className={`text-label-small whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-foreground-muted'
                }`}
              >
                {candidate.name}
              </span>
              <EvidenceMeter candidate={candidate} className="w-32" />
            </span>
          </button>
        )
      })}
    </fieldset>
  )
}
