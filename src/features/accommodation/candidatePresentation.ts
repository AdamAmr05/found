import type { CandidateSnapshot } from '../../../shared/foundTools'

export type CandidateSection = 'glance' | 'evidence' | 'next'

export const candidateSections: readonly {
  id: CandidateSection
  label: string
}[] = [
  { id: 'glance', label: 'At a glance' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'next', label: 'Next move' },
]

const signalClass = {
  caution: 'bg-accent-honey',
  negative: 'bg-accent-crimson',
  neutral: 'bg-border-loud',
  positive: 'bg-accent-forest',
} as const

const evidenceClass = {
  claimed: 'text-accent-honey',
  contradicted: 'text-accent-crimson',
  supported: 'text-accent-forest',
  unresolved: 'text-foreground-muted',
} as const

export function factSignalClass(
  signal: CandidateSnapshot['atAGlance']['facts'][number]['signal'],
): string {
  return signalClass[signal ?? 'neutral']
}

export function evidenceStatusClass(
  status: CandidateSnapshot['evidence'][number]['status'],
): string {
  return evidenceClass[status]
}

export function formatCandidatePrice(
  price: CandidateSnapshot['price'],
): { amount: string; detail: string } | undefined {
  if (!price) return undefined

  const amount = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: price.currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(price.amount)
  const basis = price.basis === 'all_in' ? 'all in' : 'base price'

  return { amount, detail: `${basis} / ${price.period}` }
}
