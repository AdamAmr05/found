import type { Candidate, ClaimStatus } from './candidates'

/**
 * How much a requirement counts as met. A contradiction is worth nothing, an
 * unsourced claim is worth half, and silence is worth a little less than that —
 * because a listing that says nothing is not the same as one that says no.
 */
const statusValue = {
  confirmed: 1,
  claimed: 0.5,
  unknown: 0.2,
  contradicted: 0,
} satisfies Record<ClaimStatus, number>

export interface RankedCandidate {
  readonly candidate: Candidate
  /** 0 to 1 against the current priority order. */
  readonly score: number
  /** The must-have requirement this candidate fails, when it fails one. */
  readonly ruledOutBy: string | null
}

function statusOf(candidate: Candidate, requirement: string): ClaimStatus {
  const claim = candidate.claims.find(
    (entry) => entry.requirement === requirement,
  )
  return claim ? claim.status : 'unknown'
}

/**
 * Priority is expressed as order, not as numbers the user has to invent. The
 * first requirement is worth `n`, the last is worth 1, and the score is the
 * weighted share of what the evidence actually supports.
 */
export function rankCandidates(
  candidates: readonly Candidate[],
  priorities: readonly string[],
  required: readonly string[],
): readonly RankedCandidate[] {
  const weightTotal = (priorities.length * (priorities.length + 1)) / 2

  const ranked = candidates.map((candidate) => {
    const earned = priorities.reduce((sum, requirement, index) => {
      const weight = priorities.length - index
      return sum + weight * statusValue[statusOf(candidate, requirement)]
    }, 0)

    const failed = required.find((requirement) => {
      const status = statusOf(candidate, requirement)
      return status === 'contradicted' || status === 'unknown'
    })

    return {
      candidate,
      score: weightTotal === 0 ? 0 : earned / weightTotal,
      ruledOutBy: failed ?? null,
    }
  })

  return [...ranked].sort(compareRanked)
}

function compareRanked(a: RankedCandidate, b: RankedCandidate): number {
  const aOut = a.ruledOutBy === null ? 0 : 1
  const bOut = b.ruledOutBy === null ? 0 : 1
  return aOut === bOut ? b.score - a.score : aOut - bOut
}

/** Every requirement the user stated, in the order the fixtures declare them. */
export function requirementNames(
  candidates: readonly Candidate[],
): readonly string[] {
  const first = candidates[0]
  return first ? first.claims.map((claim) => claim.requirement) : []
}
