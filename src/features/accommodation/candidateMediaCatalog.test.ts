import { describe, expect, it } from 'vitest'

import type {
  CandidateSnapshot,
  ReadPageOutput,
} from '../../../shared/foundTools'
import { attachCandidateMedia } from './candidateMediaCatalog'

const candidate: CandidateSnapshot = {
  ref: 'candidate-1',
  title: 'Canal-side apartment',
  location: { label: 'Berlin' },
  sources: [
    {
      ref: 'listing',
      label: 'Original listing',
      url: 'https://example.com/listing/',
    },
  ],
  atAGlance: { facts: [], summary: 'A useful option.' },
  evidence: [],
  nextMove: { summary: 'Review the details.' },
}

const page: ReadPageOutput = {
  content: 'Listing details',
  images: [
    'https://cdn.example.com/property/lounge.jpg',
    'https://cdn.example.com/assets/logo.svg',
    'https://cdn.example.com/property/lounge.jpg',
    'https://cdn.example.com/images/avatar-owner.png',
    'https://cdn.example.com/property/bedroom.webp',
  ],
  mode: 'focused',
  truncated: false,
  url: 'https://example.com/listing',
}

describe('candidate media catalog', () => {
  it('derives a deduplicated gallery from matching read-page output', () => {
    const [result] = attachCandidateMedia([candidate], [page])
    if (!result) throw new Error('Expected one candidate')

    expect(result.images).toEqual([
      {
        alt: 'Canal-side apartment — source photo',
        sourceRef: 'listing',
        url: 'https://cdn.example.com/property/lounge.jpg',
      },
      {
        alt: 'Canal-side apartment — source photo',
        sourceRef: 'listing',
        url: 'https://cdn.example.com/property/bedroom.webp',
      },
    ])
  })

  it('does not attach images from an unrelated source', () => {
    const [result] = attachCandidateMedia(
      [candidate],
      [{ ...page, url: 'https://example.com/another-listing' }],
    )
    if (!result) throw new Error('Expected one candidate')

    expect(result.images).toEqual([])
  })

  it('skips unparseable source URLs instead of failing the whole gallery', () => {
    const brokenSourceCandidate: CandidateSnapshot = {
      ...candidate,
      sources: [
        { ref: 'broken', label: 'Broken source', url: 'https://' },
        ...candidate.sources,
      ],
    }
    const [result] = attachCandidateMedia([brokenSourceCandidate], [page])
    if (!result) throw new Error('Expected one candidate')

    expect(result.images).toHaveLength(2)
  })
})
