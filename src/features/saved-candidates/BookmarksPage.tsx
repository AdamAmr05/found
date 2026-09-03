import { usePaginatedQuery } from 'convex/react'

import { api } from '../../../convex/_generated/api'
import { FoundHeader } from '../navigation/FoundHeader'
import { SavedCandidateRow } from './SavedCandidateRow'

const BOOKMARK_PAGE_SIZE = 20

export function BookmarksPage() {
  const bookmarks = usePaginatedQuery(
    api.savedCandidates.listBookmarks,
    {},
    { initialNumItems: BOOKMARK_PAGE_SIZE },
  )
  const candidates = bookmarks.results
  const loading = bookmarks.status === 'LoadingFirstPage'

  return (
    <main className="min-h-dvh bg-background-base">
      <FoundHeader />
      <section className="mx-auto w-full max-w-920 px-20 py-40 sm:px-32 sm:py-56">
        <p className="font-mono text-mono-small text-heat-100">BOOKMARKS</p>
        <h1 className="mt-12 text-title-h3 text-accent-black sm:text-title-h2">
          Places worth returning to
        </h1>
        <p className="mt-12 max-w-620 text-body-large text-foreground-muted">
          Every place you saved, across every accommodation thread. The original
          research remains attached to the message that produced it.
        </p>

        {loading ? (
          <p className="mt-40 font-mono text-mono-small text-foreground-muted">
            Loading saved places…
          </p>
        ) : candidates.length === 0 ? (
          <div className="mt-40 rounded-16 border border-border-faint bg-background-lighter p-24 text-center">
            <p className="text-label-large text-accent-black">
              Nothing saved yet
            </p>
            <p className="mx-auto mt-6 max-w-440 text-body-medium text-foreground-muted">
              Save a promising candidate in a thread and it will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-32 grid gap-12">
            {candidates.map((candidate) => (
              <SavedCandidateRow
                key={`${candidate.threadId}-${candidate.toolCallId}-${candidate.candidateRef}`}
                candidate={candidate}
              />
            ))}
          </div>
        )}

        {bookmarks.status === 'CanLoadMore' ? (
          <div className="mt-24 flex justify-center">
            <button
              className="min-h-44 rounded-10 border border-border-muted bg-background-lighter px-16 py-10 text-label-small text-accent-black transition-colors hover:border-border-loud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
              type="button"
              onClick={() => bookmarks.loadMore(BOOKMARK_PAGE_SIZE)}
            >
              Load more places
            </button>
          </div>
        ) : null}
      </section>
    </main>
  )
}
