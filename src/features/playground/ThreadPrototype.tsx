import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { AccommodationCard } from './AccommodationCard'
import { InlineMap } from './InlineMap'
import {
  accommodations,
  getAccommodation,
  type AccommodationId,
} from './accommodation'

export function ThreadPrototype() {
  const [selectedId, setSelectedId] = useState<AccommodationId>('maybachufer')
  const prefersReducedMotion = useReducedMotion()
  const selectedAccommodation = getAccommodation(selectedId)

  return (
    <div className="mx-auto w-full max-w-1180 px-16 pt-28 pb-96 md:px-28 md:pt-44">
      <header className="mb-36 grid gap-22 border-b-1 border-black/8 pb-28 md:grid-cols-[1fr_360px] md:items-end">
        <div>
          <p className="mb-10 font-mono text-mono-x-small tracking-[0.08em] text-heat-100 uppercase">
            Berlin shortlist
          </p>
          <h1 className="max-w-720 text-title-h3 text-balance">
            Two places are worth a closer look.
          </h1>
        </div>
        <p className="max-w-360 text-body-medium text-pretty text-foreground-muted md:justify-self-end">
          Select either place to keep its map, evidence, costs, and next step in
          view.
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
              I found two places worth your attention. I checked the claims
              across
              {` ${accommodations.reduce((total, item) => total + item.sourceCount, 0)} `}
              pages and mapped the real commute—not just the straight-line
              distance.
            </p>
            <p className="mt-10 text-body-large text-pretty text-foreground-muted">
              Maybachufer is the stronger fit, but its registration claim still
              needs a human confirmation. Select either place on the map to keep
              the thread aligned with what you are inspecting.
            </p>
          </div>
        </div>

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

        <div className="mt-20 grid gap-18 lg:grid-cols-2">
          {accommodations.map((accommodation, index) => (
            <motion.div
              key={accommodation.id}
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
              transition={{
                delay: prefersReducedMotion ? 0 : 0.08 + index * 0.08,
                duration: 0.32,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <AccommodationCard
                accommodation={accommodation}
                isSelected={selectedId === accommodation.id}
                onSelect={() => setSelectedId(accommodation.id)}
              />
            </motion.div>
          ))}
        </div>

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
      </main>
    </div>
  )
}
