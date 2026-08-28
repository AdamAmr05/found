import { describe, expect, it } from 'vitest'

import {
  historicalCandidatesInputSchema,
  showCandidatesInputSchema,
  type ShowCandidatesInput,
} from '../../../shared/foundTools'
import { formatCandidatePrice } from './candidatePresentation'

const candidate: ShowCandidatesInput['candidates'][number] = {
  ref: 'lichtenberg-1',
  title: 'Furnished apartment in Lichtenberg',
  location: { label: 'Berlin-Lichtenberg' },
  images: [
    {
      url: 'https://example.com/room.jpg',
      alt: 'A furnished room',
      sourceRef: 'listing',
    },
  ],
  sources: [
    {
      ref: 'listing',
      url: 'https://example.com/listing',
      label: 'Listing',
    },
  ],
  atAGlance: {
    summary: 'A furnished option within the stated budget.',
    facts: [{ label: 'Rent', value: '€855 per month', signal: 'positive' }],
  },
  evidence: [
    {
      claim: 'Anmeldung',
      finding: 'The listing states registration is possible.',
      status: 'claimed',
      sourceRefs: ['listing'],
    },
  ],
  nextMove: { summary: 'Confirm the registration paperwork.' },
}

describe('showCandidates contract', () => {
  it('accepts a grounded candidate snapshot', () => {
    expect(
      showCandidatesInputSchema.safeParse({ candidates: [candidate] }).success,
    ).toBe(true)
  })

  it('rejects evidence that points at a source outside the candidate', () => {
    const result = showCandidatesInputSchema.safeParse({
      candidates: [
        {
          ...candidate,
          evidence: [
            {
              ...candidate.evidence[0],
              sourceRefs: ['missing-source'],
            },
          ],
        },
      ],
    })

    expect(result.success).toBe(false)
  })

  it('rejects duplicate candidate references in one historical part', () => {
    const result = showCandidatesInputSchema.safeParse({
      candidates: [candidate, { ...candidate }],
    })

    expect(result.success).toBe(false)
  })

  it('rejects malformed URLs and currency codes', () => {
    const invalidSource = showCandidatesInputSchema.safeParse({
      candidates: [
        {
          ...candidate,
          sources: [{ ...candidate.sources[0], url: 'https://' }],
        },
      ],
    })
    const invalidCurrency = showCandidatesInputSchema.safeParse({
      candidates: [
        {
          ...candidate,
          price: {
            amount: 855,
            basis: 'all_in',
            confidence: 'stated',
            currency: '€€€',
            period: 'month',
          },
        },
      ],
    })

    expect(invalidSource.success).toBe(false)
    expect(invalidCurrency.success).toBe(false)
  })

  it('requires sources for claims while allowing unresolved gaps', () => {
    const unsupportedClaim = showCandidatesInputSchema.safeParse({
      candidates: [
        {
          ...candidate,
          evidence: [
            {
              ...candidate.evidence[0],
              sourceRefs: [],
            },
          ],
        },
      ],
    })
    const unresolvedGap = showCandidatesInputSchema.safeParse({
      candidates: [
        {
          ...candidate,
          evidence: [
            {
              claim: 'Internet speed',
              finding: 'No source states the connection speed.',
              sourceRefs: [],
              status: 'unresolved',
            },
          ],
        },
      ],
    })

    expect(unsupportedClaim.success).toBe(false)
    expect(unresolvedGap.success).toBe(true)
  })

  it('keeps an older valid snapshot displayable without weakening new output', () => {
    const historicalSnapshot = {
      candidates: [
        {
          ...candidate,
          evidence: [
            {
              ...candidate.evidence[0],
              sourceRefs: [],
            },
          ],
        },
      ],
    }

    expect(
      showCandidatesInputSchema.safeParse(historicalSnapshot).success,
    ).toBe(false)
    expect(
      historicalCandidatesInputSchema.safeParse(historicalSnapshot).success,
    ).toBe(true)
  })

  it('preserves price precision and exposes non-stated confidence', () => {
    const formatted = formatCandidatePrice(
      {
        amount: 1149.5,
        basis: 'all_in',
        confidence: 'estimated',
        currency: 'EUR',
        period: 'month',
      },
      'en-US',
    )

    expect(formatted?.amount).toContain('1,149.50')
    expect(formatted?.detail).toBe('all in / month · estimated')
  })
})
