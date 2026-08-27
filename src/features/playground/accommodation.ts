import { getAccommodation as getArtifact } from '../accommodation/artifact'
import type {
  AccommodationArtifact,
  AccommodationId,
  Claim,
} from '../accommodation/artifact'

export type { AccommodationId } from '../accommodation/artifact'

export type AccommodationView = 'glance' | 'evidence' | 'decision'

export type Accommodation = AccommodationArtifact

export interface RequirementSignal {
  readonly label: string
  readonly value: string
  readonly status: 'match' | 'unconfirmed' | 'mismatch'
}

export interface EvidenceSource {
  readonly label: string
  readonly detail: string
  readonly status: 'verified' | 'conflict' | 'missing'
}

export function getAccommodation(id: AccommodationId): Accommodation {
  return getArtifact(id)
}

export function requirementSignals(
  accommodation: Accommodation,
): readonly RequirementSignal[] {
  return accommodation.claims.map((claim) => ({
    label: claim.requirement,
    status: signalStatus(claim),
    value: claim.confirmed ?? claim.claimed,
  }))
}

export function evidenceSources(
  accommodation: Accommodation,
): readonly EvidenceSource[] {
  return accommodation.claims.map((claim) => ({
    label: claim.requirement,
    detail: claim.provenance,
    status:
      claim.status === 'confirmed'
        ? 'verified'
        : claim.status === 'unknown'
          ? 'missing'
          : 'conflict',
  }))
}

function signalStatus(claim: Claim): RequirementSignal['status'] {
  if (claim.status === 'confirmed') return 'match'
  if (claim.status === 'contradicted') return 'mismatch'
  return 'unconfirmed'
}
