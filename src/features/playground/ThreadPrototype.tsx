import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from 'motion/react'
import { useState } from 'react'
import { accommodations as allAccommodations } from '../accommodation/artifact'
import type { AccommodationId } from '../accommodation/artifact'
import { ShortlistTray } from '../lab/ShortlistTray'
import { CompareMerge } from '../lab/variants/CompareMerge'
import { FoldList } from '../lab/variants/FoldList'
import { AccommodationCard } from './AccommodationCard'
import { InlineMap } from './InlineMap'
import { getAccommodation } from './accommodation'

type ResultCount = 1 | 2 | 3 | 6
type ResultView = 'compare' | 'results'

const resultCounts: readonly ResultCount[] = [1, 2, 3, 6]

export function ThreadPrototype() {
  const [selectedId, setSelectedId] = useState<AccommodationId>('maybachufer')
  const [resultCount, setResultCount] = useState<ResultCount>(2)
  const [resultView, setResultView] = useState<ResultView>('results')
  const [savedIds, setSavedIds] = useState<readonly AccommodationId[]>([])
  const prefersReducedMotion = useReducedMotion()
  const selectedAccommodation = getAccommodation(selectedId)
  const accommodations = allAccommodations.slice(0, resultCount)
  const savedIdSet = new Set(savedIds)

  const showResults = (count: ResultCount) => {
    const next = allAccommodations.slice(0, count)
    setResultCount(count)
    setResultView('results')
    if (!next.some((candidate) => candidate.id === selectedId)) {
      const first = next[0]
      if (first) setSelectedId(first.id)
    }
  }

  const toggleSave = (id: AccommodationId) =>
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    )

  const openComparison = () => {
    const visibleSaved = savedIds.filter((id) =>
      accommodations.some((candidate) => candidate.id === id),
    )
    const fallback = accommodations
      .filter((candidate) => !visibleSaved.includes(candidate.id))
      .slice(0, 2 - visibleSaved.length)
      .map((candidate) => candidate.id)

    setSavedIds([...visibleSaved, ...fallback])
    setResultView('compare')
  }

  return (
    <div className="mx-auto w-full max-w-1180 px-16 pt-28 pb-96 md:px-28 md:pt-44">
      <header className="mb-36 grid gap-22 border-b-1 border-black/8 pb-28 md:grid-cols-[1fr_360px] md:items-end">
        <div>
          <p className="mb-10 font-mono text-mono-x-small tracking-[0.08em] text-heat-100 uppercase">
            Berlin shortlist
          </p>
          <h1 className="max-w-720 text-title-h3 text-balance">
            {resultCount === 1
              ? 'One place is worth a closer look.'
              : `${resultCount} places are worth a closer look.`}
          </h1>
        </div>
        <p className="max-w-360 text-body-medium text-pretty text-foreground-muted md:justify-self-end">
          The same evidence changes shape as the result set grows. Nothing is
          re-summarized when you open or compare it.
        </p>
      </header>

      <main className="mx-auto max-w-940">
        <div className="mb-24 flex gap-12">
          <div
            aria-hidden="true"
            className="grid size-32 shrink-0 place-items-center rounded-6 bg-accent-black font-mono text-mono-x-small text-white"
          >
            AI
          </div>
          <div className="max-w-720 pt-3">
            <p className="text-body-large text-pretty">
              I found {resultCount} {resultCount === 1 ? 'place' : 'places'}
              {' worth your attention. I checked the claims across'}
              {` ${accommodations.reduce((total, item) => total + item.sourceCount, 0)} `}
              pages and mapped the real commute—not just the straight-line
              distance.
            </p>
            <p className="mt-10 text-body-large text-pretty text-foreground-muted">
              Maybachufer is the stronger fit, but its registration claim still
              needs a human confirmation. Select any place on the map to keep
              the thread aligned with what you are inspecting.
            </p>
          </div>
        </div>

        <AdaptiveControls
          count={resultCount}
          isComparing={resultView === 'compare'}
          onCompare={openComparison}
          onCountChange={showResults}
        />

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <InlineMap
            accommodations={accommodations}
            onSelect={setSelectedId}
            selectedId={selectedId}
          />
        </motion.div>

        <div className="mt-10 flex items-center justify-between px-4 text-body-small text-foreground-muted">
          <span>Focused in the thread</span>
          <motion.span
            key={selectedId}
            aria-live="polite"
            animate={{ opacity: 1, x: 0 }}
            data-testid="focused-accommodation"
            initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 5 }}
          >
            {selectedAccommodation.name}
          </motion.span>
        </div>

        <LayoutGroup id="adaptive-accommodation-results">
          <AnimatePresence initial={false} mode="popLayout">
            {resultView === 'compare' ? (
              <motion.div
                key="compare"
                animate={{ opacity: 1, y: 0 }}
                className="mt-20"
                exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -8 }}
                initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }}
              >
                <CompareMerge
                  candidates={accommodations}
                  focusedId={selectedId}
                  onFocus={setSelectedId}
                  onToggleSave={toggleSave}
                  savedIds={savedIds}
                />
              </motion.div>
            ) : accommodations.length <= 2 ? (
              <motion.div
                key="cards"
                className="mt-20 grid gap-18 lg:grid-cols-2"
                exit={{ opacity: 0 }}
              >
                {accommodations.map((accommodation, index) => (
                  <motion.div
                    key={accommodation.id}
                    animate={{ opacity: 1, y: 0 }}
                    initial={{
                      opacity: 0,
                      y: prefersReducedMotion ? 0 : 12,
                    }}
                    layout
                    transition={{
                      delay: prefersReducedMotion ? 0 : 0.08 + index * 0.08,
                      duration: 0.32,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <AccommodationCard
                      accommodation={accommodation}
                      isSaved={savedIdSet.has(accommodation.id)}
                      isSelected={selectedId === accommodation.id}
                      onSelect={() => setSelectedId(accommodation.id)}
                      onToggleSave={() => toggleSave(accommodation.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="fold" className="mt-20" exit={{ opacity: 0 }}>
                <FoldList
                  candidates={accommodations}
                  focusedId={selectedId}
                  onFocus={setSelectedId}
                  onToggleSave={toggleSave}
                  savedIds={savedIds}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>

        <div className="mt-28 flex gap-12">
          <div
            aria-hidden="true"
            className="grid size-32 shrink-0 place-items-center rounded-6 bg-black/6 font-mono text-mono-x-small text-foreground-muted"
          >
            YOU
          </div>
          <div className="max-w-680 rounded-12 bg-black/4 px-16 py-12 text-body-medium">
            What would you ask before I contact them?
          </div>
        </div>

        <ShortlistTray
          candidates={allAccommodations}
          onClear={() => setSavedIds([])}
          onRemove={(id) =>
            setSavedIds((current) => current.filter((entry) => entry !== id))
          }
          savedIds={savedIds}
        />
      </main>
    </div>
  )
}

function AdaptiveControls({
  count,
  isComparing,
  onCompare,
  onCountChange,
}: {
  readonly count: ResultCount
  readonly isComparing: boolean
  readonly onCompare: () => void
  readonly onCountChange: (count: ResultCount) => void
}) {
  return (
    <div className="mb-14 flex flex-wrap items-center justify-between gap-10 rounded-12 bg-black/4 p-4 pl-12">
      <fieldset className="flex items-center gap-10">
        <legend className="sr-only">Visible results</legend>
        <span
          aria-hidden="true"
          className="font-mono text-mono-x-small text-foreground-muted"
        >
          Results arriving
        </span>
        <div className="flex gap-2">
          {resultCounts.map((value) => (
            <motion.button
              key={value}
              aria-pressed={!isComparing && value === count}
              className={`grid size-40 place-items-center rounded-8 font-mono text-mono-x-small tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 ${
                !isComparing && value === count
                  ? 'bg-background-lighter text-accent-black shadow-[0_1px_3px_rgb(38_38_38/0.12)]'
                  : 'text-foreground-muted'
              }`}
              onClick={() => onCountChange(value)}
              type="button"
              whileTap={{ scale: 0.96 }}
            >
              {value}
            </motion.button>
          ))}
        </div>
      </fieldset>

      <motion.button
        aria-pressed={isComparing}
        className={`min-h-40 rounded-8 px-14 text-label-small focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 ${
          isComparing
            ? 'bg-accent-black text-white'
            : 'bg-background-lighter text-accent-black shadow-[0_1px_3px_rgb(38_38_38/0.1)]'
        }`}
        disabled={count < 2}
        onClick={onCompare}
        type="button"
        whileTap={{ scale: 0.96 }}
      >
        Compare
      </motion.button>
    </div>
  )
}
