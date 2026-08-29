import type {
  CandidateSnapshot,
  ReadPageOutput,
} from '../../../shared/foundTools'
import {
  candidateSourceImages,
  type CandidateSourceImage,
} from '../../../shared/candidateImages'

export type CandidateImage = CandidateSourceImage

export type RenderableCandidate = CandidateSnapshot & {
  readonly images: readonly CandidateImage[]
}

export function attachCandidateMedia(
  candidates: readonly CandidateSnapshot[],
  pages: readonly ReadPageOutput[],
): RenderableCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    images: candidateSourceImages(candidate, pages),
  }))
}
