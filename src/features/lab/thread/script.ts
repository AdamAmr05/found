import type { CandidateId } from '../candidates'

/**
 * The mocked conversation. Prose is stored as segments rather than a string so
 * the parts of a sentence that depend on the current requirements can be
 * recomputed instead of going stale the moment the user changes something.
 */
export type ProseSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'ceiling' }
  | { readonly kind: 'withinCount' }
  | { readonly kind: 'overCount' }
  | { readonly kind: 'openCount' }

export type ThreadEntry =
  | {
      readonly kind: 'assistant'
      readonly id: string
      readonly prose: readonly ProseSegment[]
    }
  | { readonly kind: 'user'; readonly id: string; readonly text: string }
  | {
      readonly kind: 'artifacts'
      readonly id: string
      readonly candidateIds: readonly CandidateId[]
    }
  | { readonly kind: 'outreach'; readonly id: string }

const text = (value: string): ProseSegment => ({ kind: 'text', text: value })

export const threadScript: readonly ThreadEntry[] = [
  {
    kind: 'user',
    id: 'brief',
    text: 'One bedroom in Berlin, under €1,250 all in, registration must be possible, and I start at TU in September.',
  },
  {
    kind: 'assistant',
    id: 'first-pass',
    prose: [
      text('I read 46 pages across six candidates. Against a ceiling of '),
      { kind: 'ceiling' },
      text(' a month, '),
      { kind: 'withinCount' },
      text(' of them fit and '),
      { kind: 'overCount' },
      text(' do not. Adjust the ceiling here and I’ll re-rank the six.'),
    ],
  },
  {
    kind: 'artifacts',
    id: 'first-artifacts',
    candidateIds: ['maybachufer', 'helmholtzplatz', 'samariter'],
  },
  {
    kind: 'user',
    id: 'follow-up',
    text: 'The canal one looks right. What is still unconfirmed about it?',
  },
  {
    kind: 'assistant',
    id: 'second-pass',
    prose: [
      text(
        'Its registration claim appears only in the listing body; no operator or contract source repeats it. I kept the place open below so you can inspect the evidence.',
      ),
    ],
  },
  {
    kind: 'artifacts',
    id: 'second-artifacts',
    candidateIds: ['maybachufer'],
  },
  {
    kind: 'assistant',
    id: 'outreach-intro',
    prose: [
      { kind: 'openCount' },
      text(
        ' questions are still open across these six. I can only ask them if you approve the exact wording.',
      ),
    ],
  },
  { kind: 'outreach', id: 'outreach' },
]
