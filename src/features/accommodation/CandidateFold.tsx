import { m, useReducedMotion } from 'motion/react'
import { useId, useState } from 'react'

import { CandidateDetails } from './CandidateDetails'
import { CandidateImageFallback } from './CandidateImageFallback'
import { CandidateMedia } from './CandidateMedia'
import { CandidateSectionTabs } from './CandidateSectionTabs'
import type {
  CandidateImage,
  RenderableCandidate,
} from './candidateMediaCatalog'
import type { CandidateSection } from './candidatePresentation'
import { formatCandidatePrice } from './candidatePresentation'

interface CandidateFoldProps {
  readonly candidates: readonly RenderableCandidate[]
  readonly layoutScope: string
  readonly saveErrorRef: string | undefined
  readonly savedRefs: ReadonlySet<string>
  readonly onToggleSave: (candidateRef: string) => void
}

export function CandidateFold({
  candidates,
  layoutScope,
  saveErrorRef,
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
            layoutScope={layoutScope}
            open={candidate.ref === openRef}
            saveError={candidate.ref === saveErrorRef}
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
  layoutScope,
  open,
  saveError,
  saved,
  onOpen,
  onToggleSave,
}: {
  readonly candidate: RenderableCandidate
  readonly layoutScope: string
  readonly open: boolean
  readonly saveError: boolean
  readonly saved: boolean
  readonly onOpen: () => void
  readonly onToggleSave: () => void
}) {
  const [section, setSection] = useState<CandidateSection>('glance')
  const reducedMotion = useReducedMotion()
  const tabsId = useId()
  const detailsId = `${tabsId}-disclosure`
  const price = formatCandidatePrice(candidate.price)
  const mediaLayoutId = `${layoutScope}-${candidate.ref}-media`
  const titleLayoutId = `${layoutScope}-${candidate.ref}-title`
  const priceLayoutId = `${layoutScope}-${candidate.ref}-price`

  return (
    <m.article
      animate={{ borderRadius: open ? 16 : 12 }}
      className={`overflow-hidden rounded-12 bg-background-lighter transition-shadow duration-200 ${
        open ? 'shadow-surface-artifact' : 'shadow-surface-compact'
      }`}
      data-testid={`fold-row-${candidate.ref}`}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
    >
      <FoldHeader
        candidate={candidate}
        controlsId={detailsId}
        open={open}
        mediaLayoutId={mediaLayoutId}
        price={price?.amount}
        priceLayoutId={priceLayoutId}
        reducedMotion={reducedMotion}
        titleLayoutId={titleLayoutId}
        onOpen={onOpen}
      />

      <m.div
        id={detailsId}
        animate={{ height: open ? 'auto' : 0 }}
        aria-hidden={!open}
        className="overflow-hidden"
        initial={false}
        inert={!open}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: 'spring', bounce: 0, duration: 0.32 }
        }
      >
        <FoldExpandedDetails
          candidate={candidate}
          mediaLayoutId={open ? mediaLayoutId : undefined}
          saveError={saveError}
          saved={saved}
          section={section}
          tabsId={tabsId}
          onSectionChange={setSection}
          onToggleSave={onToggleSave}
        />
      </m.div>
    </m.article>
  )
}

function FoldHeader({
  candidate,
  controlsId,
  open,
  mediaLayoutId,
  price,
  priceLayoutId,
  reducedMotion,
  titleLayoutId,
  onOpen,
}: {
  readonly candidate: RenderableCandidate
  readonly controlsId: string
  readonly open: boolean
  readonly mediaLayoutId: string
  readonly price: string | undefined
  readonly priceLayoutId: string
  readonly reducedMotion: boolean | null
  readonly titleLayoutId: string
  readonly onOpen: () => void
}) {
  return (
    <button
      aria-controls={controlsId}
      aria-expanded={open}
      className="flex w-full items-center gap-13 px-14 py-12 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-heat-100"
      type="button"
      onClick={onOpen}
    >
      {open ? null : (
        <CandidateThumbnail
          images={candidate.images}
          layoutId={mediaLayoutId}
          reducedMotion={reducedMotion}
        />
      )}
      <m.span
        className="min-w-0 flex-1"
        layout="position"
        layoutId={titleLayoutId}
      >
        <span className="block truncate text-label-medium">
          {candidate.title}
        </span>
        <span className="block truncate text-body-small text-foreground-muted">
          {candidate.location.label}
        </span>
      </m.span>
      <m.span
        className="shrink-0 text-right"
        layout="position"
        layoutId={priceLayoutId}
      >
        <span className="block font-mono text-mono-small tabular-nums">
          {price ?? 'Unknown'}
        </span>
      </m.span>
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
  mediaLayoutId,
  saveError,
  saved,
  section,
  tabsId,
  onSectionChange,
  onToggleSave,
}: {
  readonly candidate: RenderableCandidate
  readonly mediaLayoutId: string | undefined
  readonly saveError: boolean
  readonly saved: boolean
  readonly section: CandidateSection
  readonly tabsId: string
  readonly onSectionChange: (section: CandidateSection) => void
  readonly onToggleSave: () => void
}) {
  const saveErrorId = `${tabsId}-shortlist-error`

  return (
    <div className="px-14 pb-14">
      <CandidateMedia
        candidate={candidate}
        compact
        {...(mediaLayoutId ? { layoutId: mediaLayoutId } : {})}
      />
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
        aria-describedby={saveError ? saveErrorId : undefined}
        aria-pressed={saved}
        className={`mt-12 min-h-40 w-full rounded-10 px-14 text-label-small ${
          saved ? 'bg-accent-black text-white' : 'bg-heat-100 text-white'
        }`}
        type="button"
        onClick={onToggleSave}
      >
        {saved ? 'On the shortlist' : 'Add to shortlist'}
      </button>
      {saveError ? (
        <p
          className="mt-8 text-center text-label-x-small text-accent-crimson"
          id={saveErrorId}
          role="alert"
        >
          Couldn’t update shortlist. Try again.
        </p>
      ) : null}
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
  layoutId,
  reducedMotion,
}: {
  readonly images: readonly CandidateImage[]
  readonly layoutId: string
  readonly reducedMotion: boolean | null
}) {
  const [failedUrls, setFailedUrls] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const image = images.find((item) => !failedUrls.has(item.url))

  return (
    <m.div
      className="h-52 w-64 shrink-0 overflow-hidden rounded-8 bg-black/4"
      layoutId={layoutId}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: 'spring', bounce: 0, duration: 0.34 }
      }
    >
      {image ? (
        <img
          alt=""
          className="size-full object-cover"
          loading="eager"
          src={image.url}
          onError={() =>
            setFailedUrls((current) => new Set([...current, image.url]))
          }
        />
      ) : (
        <CandidateImageFallback compact />
      )}
    </m.div>
  )
}
