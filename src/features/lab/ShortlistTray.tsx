import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import type { Candidate, CandidateId } from './candidates'
import { euros } from './candidates'
import { useCeiling } from './requirements'
import { ChevronIcon, CloseIcon } from './icons'
import {
  revealTransition,
  settleTransition,
  snapTransition,
  travel,
} from './motion'

/**
 * The shortlist survives every representation, so it is present on every one of
 * them. It stays a pill until you ask for it: a permanent tray would sit on top
 * of the artifact you are reading, and the saved set is something you check
 * between decisions rather than while making one.
 */
export function ShortlistTray({
  candidates,
  savedIds,
  onRemove,
  onClear,
}: {
  readonly candidates: readonly Candidate[]
  readonly savedIds: readonly CandidateId[]
  readonly onRemove: (id: CandidateId) => void
  readonly onClear: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ceiling = useCeiling()
  const prefersReducedMotion = useReducedMotion()
  const saved = candidates.filter((entry) => savedIds.includes(entry.id))
  const total = saved.reduce((sum, entry) => sum + entry.allIn, 0)
  const withinCeiling = saved.filter((entry) => entry.allIn <= ceiling).length

  return (
    <aside
      aria-label="Shortlist"
      className="pointer-events-none sticky bottom-20 z-40 flex justify-center"
    >
      <motion.div
        className="pointer-events-auto overflow-hidden bg-background-lighter shadow-[0_0_0_1px_rgb(38_38_38/0.1),0_12px_32px_rgb(38_38_38/0.12)]"
        layout
        style={{ borderRadius: isOpen ? 16 : 999 }}
        transition={settleTransition}
      >
        <motion.button
          aria-expanded={isOpen}
          className="flex min-h-48 w-full items-center gap-12 pr-14 pl-8 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-heat-100"
          disabled={saved.length === 0}
          layout
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <ThumbnailStack saved={saved} />

          <motion.span className="flex items-baseline gap-8" layout="position">
            <span className="text-label-small whitespace-nowrap">
              {saved.length === 0
                ? 'Nothing shortlisted yet'
                : `${saved.length} shortlisted`}
            </span>
            {saved.length > 0 ? (
              <span className="font-mono text-mono-x-small text-foreground-muted tabular-nums">
                {euros(total)} / month
              </span>
            ) : null}
          </motion.span>

          {saved.length > 0 ? (
            <motion.span
              animate={{ rotate: isOpen ? -90 : 90 }}
              className="ml-4 text-foreground-muted"
              transition={snapTransition}
            >
              <ChevronIcon className="size-15" />
            </motion.span>
          ) : null}
        </motion.button>

        <AnimatePresence initial={false}>
          {isOpen && saved.length > 0 ? (
            <motion.div
              key="tray"
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={settleTransition}
            >
              <div className="w-380 border-t-1 border-border-faint p-8">
                <ul className="flex flex-col gap-2">
                  <AnimatePresence initial={false} mode="popLayout">
                    {saved.map((candidate) => (
                      <motion.li
                        key={candidate.id}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{
                          opacity: 0,
                          x: travel(prefersReducedMotion, 12),
                        }}
                        initial={{
                          opacity: 0,
                          x: travel(prefersReducedMotion, -12),
                        }}
                        layout
                        transition={revealTransition}
                      >
                        <SavedRow
                          candidate={candidate}
                          onRemove={() => onRemove(candidate.id)}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>

                <div className="mt-8 flex items-center justify-between border-t-1 border-border-faint px-10 pt-10">
                  <p className="text-label-x-small text-foreground-muted">
                    {withinCeiling} of {saved.length} within your ceiling
                  </p>
                  <motion.button
                    className="min-h-30 rounded-8 px-10 text-label-x-small text-foreground-muted hover:bg-black/4 hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
                    onClick={onClear}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                  >
                    Clear all
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </aside>
  )
}

/** Collapsed, the set is a stack: enough to recognise, not enough to read. */
function ThumbnailStack({ saved }: { readonly saved: readonly Candidate[] }) {
  if (saved.length === 0) {
    return (
      <span
        aria-hidden="true"
        className="size-32 shrink-0 rounded-full border-1 border-dashed border-border-loud"
      />
    )
  }

  return (
    <span aria-hidden="true" className="flex shrink-0 items-center">
      <AnimatePresence initial={false} mode="popLayout">
        {saved.slice(0, 4).map((candidate, index) => (
          <motion.span
            key={candidate.id}
            animate={{ opacity: 1, scale: 1 }}
            className="size-32 overflow-hidden rounded-full bg-black/8 ring-2 ring-background-lighter"
            exit={{ opacity: 0, scale: 0.6 }}
            initial={{ opacity: 0, scale: 0.6 }}
            layout
            style={{ marginLeft: index === 0 ? 0 : -10, zIndex: 4 - index }}
            transition={snapTransition}
          >
            <img
              alt=""
              className="size-full object-cover"
              src={candidate.imageUrl}
            />
          </motion.span>
        ))}
      </AnimatePresence>
      {saved.length > 4 ? (
        <span className="-ml-10 grid size-32 place-items-center rounded-full bg-accent-black font-mono text-mono-x-small text-white ring-2 ring-background-lighter">
          {saved.length - 4}
        </span>
      ) : null}
    </span>
  )
}

function SavedRow({
  candidate,
  onRemove,
}: {
  readonly candidate: Candidate
  readonly onRemove: () => void
}) {
  const ceiling = useCeiling()
  const over = candidate.allIn - ceiling

  return (
    <div className="flex min-h-52 items-center gap-10 rounded-10 px-10 hover:bg-black/3">
      <span className="size-36 shrink-0 overflow-hidden rounded-8 bg-black/8">
        <img
          alt=""
          className="size-full object-cover"
          src={candidate.imageUrl}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label-small">
          {candidate.name}
        </span>
        <span className="block truncate text-label-x-small text-foreground-muted">
          {candidate.area}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-mono text-mono-small tabular-nums">
          {euros(candidate.allIn)}
        </span>
        <span
          className={`block text-label-x-small ${
            over > 0 ? 'text-accent-crimson' : 'text-foreground-muted'
          }`}
        >
          {over > 0 ? `+${euros(over)}` : 'within'}
        </span>
      </span>
      <button
        aria-label={`Remove ${candidate.name} from the shortlist`}
        className="grid size-28 shrink-0 place-items-center rounded-6 text-foreground-muted hover:bg-black/6 hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-heat-100"
        onClick={onRemove}
        type="button"
      >
        <CloseIcon className="size-14" />
      </button>
    </div>
  )
}
