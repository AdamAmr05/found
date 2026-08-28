import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useId, useState } from 'react'

import type { CandidateSnapshot } from '../../../shared/foundTools'
import { AnimatedHeight } from '../../components/motion/AnimatedHeight'
import { CandidateDetails } from './CandidateDetails'
import { CandidateImageFallback } from './CandidateImageFallback'
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
  const reducedMotion = useReducedMotion()
  const tabsId = useId()
  const price = formatCandidatePrice(candidate.price)

  return (
    <article className="overflow-hidden rounded-12 bg-background-lighter shadow-[0_0_0_1px_rgb(38_38_38/0.08),0_1px_2px_rgb(38_38_38/0.04)]">
      <FoldHeader
        candidate={candidate}
        open={open}
        price={price?.amount}
        reducedMotion={reducedMotion}
        onOpen={onOpen}
      />

      <AnimatedHeight open={open}>
        <AnimatePresence initial={false}>
          {open ? (
            <m.div
              key="details"
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }}
              initial={{ opacity: 0, y: reducedMotion ? 0 : 4 }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 360, damping: 38 }
              }
            >
              <FoldExpandedDetails
                candidate={candidate}
                saved={saved}
                section={section}
                tabsId={tabsId}
                onSectionChange={setSection}
                onToggleSave={onToggleSave}
              />
            </m.div>
          ) : null}
        </AnimatePresence>
      </AnimatedHeight>
    </article>
  )
}

function FoldHeader({
  candidate,
  open,
  price,
  reducedMotion,
  onOpen,
}: {
  readonly candidate: CandidateSnapshot
  readonly open: boolean
  readonly price: string | undefined
  readonly reducedMotion: boolean | null
  readonly onOpen: () => void
}) {
  return (
    <button
      aria-expanded={open}
      className="flex w-full items-center gap-13 px-14 py-12 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-heat-100"
      type="button"
      onClick={onOpen}
    >
      <CandidateThumbnail images={candidate.images} />
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
          {price ?? 'Unknown'}
        </span>
        <span className="block text-label-x-small text-foreground-muted">
          {candidate.sources.length} source
          {candidate.sources.length === 1 ? '' : 's'}
        </span>
      </span>
      <m.span
        aria-hidden="true"
        animate={{ rotate: open ? 45 : 0 }}
        className="ml-2 grid size-20 shrink-0 place-items-center"
        transition={reducedMotion ? { duration: 0 } : { duration: 0.16 }}
      >
        <PlusIcon />
      </m.span>
    </button>
  )
}

function FoldExpandedDetails({
  candidate,
  saved,
  section,
  tabsId,
  onSectionChange,
  onToggleSave,
}: {
  readonly candidate: CandidateSnapshot
  readonly saved: boolean
  readonly section: CandidateSection
  readonly tabsId: string
  readonly onSectionChange: (section: CandidateSection) => void
  readonly onToggleSave: () => void
}) {
  return (
    <div className="px-14 pb-14">
      <CandidateMedia candidate={candidate} compact />
      <div className="mt-12">
        <CandidateSectionTabs
          idBase={tabsId}
          section={section}
          onChange={onSectionChange}
        />
      </div>
      <div className="mt-14">
        <CandidateDetails
          candidate={candidate}
          idBase={tabsId}
          section={section}
        />
      </div>
      <button
        aria-pressed={saved}
        className={`mt-12 min-h-40 w-full rounded-10 px-14 text-label-small ${
          saved ? 'bg-accent-black text-white' : 'bg-heat-100 text-white'
        }`}
        type="button"
        onClick={onToggleSave}
      >
        {saved ? 'On the shortlist' : 'Add to shortlist'}
      </button>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg aria-hidden className="size-16" viewBox="0 0 16 16">
      <path
        d="M8 3v10M3 8h10"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function CandidateThumbnail({
  images,
}: {
  readonly images: CandidateSnapshot['images']
}) {
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const image = images.find((item) => !failedUrls.has(item.url))

  return (
    <span className="size-44 shrink-0 overflow-hidden rounded-8 bg-black/4">
      {image ? (
        <img
          alt=""
          className="size-full object-cover"
          loading="lazy"
          src={image.url}
          onError={() =>
            setFailedUrls((current) => new Set([...current, image.url]))
          }
        />
      ) : (
        <CandidateImageFallback compact />
      )}
    </span>
  )
}
