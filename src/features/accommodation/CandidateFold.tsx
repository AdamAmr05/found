import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import type { CandidateSnapshot } from '../../../shared/foundTools'
import { CandidateDetails } from './CandidateDetails'
import { CandidateMedia } from './CandidateMedia'
import { CandidateSectionTabs } from './CandidateSectionTabs'
import type { CandidateSection } from './candidatePresentation'
import { formatCandidatePrice } from './candidatePresentation'

interface CandidateFoldProps {
  readonly candidates: readonly CandidateSnapshot[]
  readonly savedRefs: ReadonlySet<string>
  readonly onToggleSave: (candidateRef: string) => void
}

export function CandidateFold({
  candidates,
  savedRefs,
  onToggleSave,
}: CandidateFoldProps) {
  const [openRef, setOpenRef] = useState<string>()

  return (
    <ul className="flex flex-col gap-8">
      {candidates.map((candidate) => (
        <li key={candidate.ref}>
          <FoldRow
            candidate={candidate}
            open={candidate.ref === openRef}
            saved={savedRefs.has(candidate.ref)}
            onOpen={() =>
              setOpenRef((current) =>
                current === candidate.ref ? undefined : candidate.ref,
              )
            }
            onToggleSave={() => onToggleSave(candidate.ref)}
          />
        </li>
      ))}
    </ul>
  )
}

function FoldRow({
  candidate,
  open,
  saved,
  onOpen,
  onToggleSave,
}: {
  readonly candidate: CandidateSnapshot
  readonly open: boolean
  readonly saved: boolean
  readonly onOpen: () => void
  readonly onToggleSave: () => void
}) {
  const [section, setSection] = useState<CandidateSection>('glance')
  const price = formatCandidatePrice(candidate.price)
  const thumbnail = candidate.images[0]

  return (
    <article className="overflow-hidden rounded-12 bg-background-lighter shadow-[0_0_0_1px_rgb(38_38_38/0.08),0_1px_2px_rgb(38_38_38/0.04)]">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-13 px-14 py-12 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-heat-100"
        type="button"
        onClick={onOpen}
      >
        <span className="size-44 shrink-0 overflow-hidden rounded-8 bg-black/4">
          {thumbnail ? (
            <img
              alt=""
              className="size-full object-cover"
              loading="lazy"
              src={thumbnail.url}
            />
          ) : null}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-label-medium">
            {candidate.title}
          </span>
          <span className="block truncate text-body-small text-foreground-muted">
            {candidate.location.label}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-mono-small tabular-nums">
            {price?.amount ?? 'Unknown'}
          </span>
          <span className="block text-label-x-small text-foreground-muted">
            {candidate.sources.length} source
            {candidate.sources.length === 1 ? '' : 's'}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`ml-2 text-body-large transition-transform ${open ? 'rotate-45' : ''}`}
        >
          +
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="details"
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 38 }}
          >
            <div className="px-14 pb-14">
              <CandidateMedia candidate={candidate} compact />
              <div className="mt-12">
                <CandidateSectionTabs
                  candidateRef={`fold-${candidate.ref}`}
                  section={section}
                  onChange={setSection}
                />
              </div>
              <div className="mt-14">
                <CandidateDetails candidate={candidate} section={section} />
              </div>
              <button
                aria-pressed={saved}
                className={`mt-12 min-h-40 w-full rounded-10 px-14 text-label-small ${
                  saved
                    ? 'bg-accent-black text-white'
                    : 'bg-heat-100 text-white'
                }`}
                type="button"
                onClick={onToggleSave}
              >
                {saved ? 'On the shortlist' : 'Add to shortlist'}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </article>
  )
}
