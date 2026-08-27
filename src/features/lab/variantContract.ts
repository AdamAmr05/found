import type { Candidate, CandidateId } from './candidates'

/**
 * Every variant is a different resolution of the same artifact set, so they all
 * receive the same state and report the same intents. Nothing about focus or
 * the shortlist belongs to an individual representation.
 */
export interface VariantProps {
  readonly candidates: readonly Candidate[]
  readonly focusedId: CandidateId
  readonly onFocus: (id: CandidateId) => void
  readonly savedIds: readonly CandidateId[]
  readonly onToggleSave: (id: CandidateId) => void
}
