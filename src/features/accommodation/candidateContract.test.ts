import { describe, expect, it } from 'vitest'

import {
  showCandidatesInputSchema,
  type ShowCandidatesInput,
} from '../../../shared/foundTools'

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
})
