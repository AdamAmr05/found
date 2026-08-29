import { formatCandidatePrice } from '../accommodation/candidatePresentation'
import { CandidateThumbnail } from './CandidateThumbnail'

export interface SavedCandidateView {
  readonly candidateRef: string
  readonly imageUrl?: string
  readonly locationLabel: string
  readonly price?: {
    readonly amount: number
    readonly basis: 'all_in' | 'base'
    readonly confidence: 'stated' | 'derived' | 'estimated'
    readonly currency: string
    readonly period: 'night' | 'week' | 'month' | 'stay'
  }
  readonly savedAt: number
  readonly source: { readonly label: string; readonly url: string }
  readonly summary: string
  readonly threadId: string
  readonly title: string
  readonly toolCallId: string
}

export function SavedCandidateRow({
  candidate,
  compact = false,
}: {
  readonly candidate: SavedCandidateView
  readonly compact?: boolean
}) {
  const price = formatCandidatePrice(candidate.price)

  return (
    <article
      className={
        compact
          ? 'grid grid-cols-[48px_minmax(0,1fr)] gap-12 rounded-12 p-8 transition-colors hover:bg-background-lighter'
          : 'grid grid-cols-[72px_minmax(0,1fr)] gap-14 rounded-16 border border-border-faint bg-background-lighter p-10 shadow-surface-compact sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center sm:p-12'
      }
    >
      <div
        className={`${compact ? 'size-48 rounded-10' : 'size-72 rounded-12 sm:size-88'} overflow-hidden`}
      >
        <CandidateThumbnail imageUrl={candidate.imageUrl} />
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 items-baseline justify-between gap-12">
          <h2
            className={`${compact ? 'text-label-medium' : 'text-label-large'} truncate text-accent-black`}
          >
            {candidate.title}
          </h2>
          {compact && price ? (
            <span className="shrink-0 font-mono text-mono-small text-accent-black">
              {price.amount}
            </span>
          ) : null}
        </div>
        <p className="mt-2 truncate text-body-small text-foreground-muted">
          {candidate.locationLabel}
        </p>
        {!compact ? (
          <p className="mt-8 line-clamp-2 max-w-620 text-body-medium text-foreground-muted">
            {candidate.summary}
          </p>
        ) : null}
      </div>
      {!compact ? (
        <div className="col-span-2 flex items-center justify-between gap-12 border-t border-border-faint pt-10 sm:col-span-1 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
          <div className="text-right">
            <p className="font-mono text-mono-medium text-accent-black">
              {price?.amount ?? 'Price unknown'}
            </p>
            {price ? (
              <p className="mt-1 text-body-small text-foreground-muted">
                {price.detail}
              </p>
            ) : null}
          </div>
          <a
            className="text-label-small text-heat-100 underline underline-offset-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
            href={candidate.source.url}
            rel="noreferrer"
            target="_blank"
          >
            {candidate.source.label}
          </a>
        </div>
      ) : null}
    </article>
  )
}
