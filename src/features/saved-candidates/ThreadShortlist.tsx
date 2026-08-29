import {
  useSessionMutation,
  useSessionPaginatedQuery,
} from 'convex-helpers/react/sessions'
import { useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { formatCandidatePrice } from '../accommodation/candidatePresentation'
import { ShortlistTray, type ShortlistTrayItem } from './ShortlistTray'
import type {
  AvailableSavedCandidateView,
  SavedCandidateView,
} from './SavedCandidateRow'

const SHORTLIST_PAGE_SIZE = 5

export function ThreadShortlist({ threadId }: { readonly threadId: string }) {
  const [removeError, setRemoveError] = useState(false)
  const shortlist = useSessionPaginatedQuery(
    api.savedCandidates.listForThread,
    { threadId },
    { initialNumItems: SHORTLIST_PAGE_SIZE },
  )
  const setSaved = useSessionMutation(api.savedCandidates.setSaved)
  const candidates = shortlist?.results ?? []
  const hasMore =
    shortlist?.status === 'CanLoadMore' || shortlist?.status === 'LoadingMore'
  const items = candidates.map(toTrayItem)
  const summary = shortlistSummary(candidates, hasMore)

  if (shortlist?.status === 'LoadingFirstPage' || candidates.length === 0) {
    return null
  }

  async function remove(item: ShortlistTrayItem): Promise<void> {
    const candidate = candidates.find(
      (entry) => candidateKey(entry) === item.id,
    )
    if (!candidate) return

    setRemoveError(false)
    try {
      await setSaved({
        candidateRef: candidate.candidateRef,
        saved: false,
        threadId: candidate.threadId,
        toolCallId: candidate.toolCallId,
      })
    } catch (error) {
      globalThis.reportError(error)
      setRemoveError(true)
    }
  }

  return (
    <div className="mb-10">
      <ShortlistTray
        footerNote={
          removeError
            ? 'Couldn’t update the shortlist.'
            : 'Saved from this thread'
        }
        hasMore={hasMore}
        items={items}
        loadingMore={shortlist?.status === 'LoadingMore'}
        onLoadMore={
          hasMore ? () => shortlist.loadMore(SHORTLIST_PAGE_SIZE) : undefined
        }
        onRemove={(item) => void remove(item)}
        summary={summary}
      />
    </div>
  )
}

function shortlistSummary(
  candidates: readonly SavedCandidateView[],
  hasMore: boolean,
): string | undefined {
  if (hasMore || candidates.length === 0) return undefined

  const availableCandidates = candidates.filter(
    (candidate): candidate is AvailableSavedCandidateView =>
      candidate.state === 'available',
  )
  if (availableCandidates.length !== candidates.length) return undefined

  const prices = availableCandidates.map((candidate) => candidate.price)
  const first = prices[0]
  if (
    !first ||
    first.period !== 'month' ||
    prices.some(
      (price) =>
        !price || price.period !== 'month' || price.currency !== first.currency,
    )
  ) {
    return undefined
  }

  const total = prices.reduce((sum, price) => sum + (price?.amount ?? 0), 0)
  try {
    const amount = new Intl.NumberFormat(undefined, {
      currency: first.currency,
      maximumFractionDigits: 2,
      style: 'currency',
    }).format(total)
    return `${amount} / month`
  } catch {
    return `${total} ${first.currency} / month`
  }
}

function candidateKey(candidate: SavedCandidateView): string {
  return `${candidate.threadId}:${candidate.toolCallId}:${candidate.candidateRef}`
}

function toTrayItem(candidate: SavedCandidateView): ShortlistTrayItem {
  if (candidate.state === 'unavailable') {
    return {
      id: candidateKey(candidate),
      subtitle: 'Original research could not be loaded',
      title: 'Saved candidate unavailable',
    }
  }

  const price = formatCandidatePrice(candidate.price)
  const item: ShortlistTrayItem = {
    id: candidateKey(candidate),
    imageUrl: candidate.imageUrl,
    subtitle: candidate.locationLabel,
    title: candidate.title,
  }
  if (!price) return item

  return { ...item, priceLabel: price.amount, priceStatus: price.detail }
}
