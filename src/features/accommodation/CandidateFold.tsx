import { Plus } from '@phosphor-icons/react'
import {
  AnimatePresence,
  motion,
  type Transition,
  useReducedMotion,
} from 'motion/react'
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
import type { CandidateMapBridge } from './CandidateResults'

const foldSpring: Transition = {
  type: 'spring',
  stiffness: 340,
  damping: 36,
}

interface CandidateFoldProps {
  readonly candidates: readonly RenderableCandidate[]
  readonly layoutScope: string
  readonly mapBridge?: CandidateMapBridge | undefined
  readonly saveErrorRef: string | undefined
  readonly saveDisabled: boolean
  readonly savedRefs: ReadonlySet<string>
  readonly onToggleSave: (candidateRef: string) => void
}

export function CandidateFold({
  candidates,
  layoutScope,
  mapBridge,
  saveErrorRef,
  saveDisabled,
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
            mapHighlighted={mapBridge?.selectedRef === candidate.ref}
            open={candidate.ref === openRef}
            saveError={candidate.ref === saveErrorRef}
            saveDisabled={saveDisabled}
            saved={savedRefs.has(candidate.ref)}
            onOpen={() =>
              setOpenRef((current) =>
                current === candidate.ref ? undefined : candidate.ref,
              )
            }
            onOpenMap={
              mapBridge?.mappedRefs.has(candidate.ref)
                ? () => mapBridge.onOpenMap(candidate.ref)
                : undefined
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
  mapHighlighted,
  open,
  saveError,
  saveDisabled,
  saved,
  onOpen,
  onOpenMap,
  onToggleSave,
}: {
  readonly candidate: RenderableCandidate
  readonly layoutScope: string
  readonly mapHighlighted: boolean
  readonly open: boolean
  readonly saveError: boolean
  readonly saveDisabled: boolean
  readonly saved: boolean
  readonly onOpen: () => void
  readonly onOpenMap: (() => void) | undefined
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
    <motion.article
      animate={{ borderRadius: open ? 16 : 12 }}
      className={`overflow-hidden rounded-12 bg-background-lighter transition-shadow duration-200 ${
        open ? 'shadow-surface-artifact' : 'shadow-surface-compact'
      } ${mapHighlighted ? 'outline-2 outline-offset-2 outline-heat-100' : ''}`}
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

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="details"
            id={detailsId}
            animate={{ height: 'auto' }}
            className="overflow-hidden"
            exit={{ height: 0 }}
            initial={{ height: 0 }}
            style={{ transformOrigin: 'top' }}
            transition={reducedMotion ? { duration: 0 } : foldSpring}
          >
            <FoldExpandedDetails
              candidate={candidate}
              mediaLayoutId={mediaLayoutId}
              onOpenMap={onOpenMap}
              saveError={saveError}
              saveDisabled={saveDisabled}
              saved={saved}
              section={section}
              tabsId={tabsId}
              onSectionChange={setSection}
              onToggleSave={onToggleSave}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
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
      <motion.span
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
      </motion.span>
      <motion.span
        className="shrink-0 text-right"
        layout="position"
        layoutId={priceLayoutId}
      >
        <span className="block font-mono text-mono-small tabular-nums">
          {price ?? 'Unknown'}
        </span>
      </motion.span>
      <motion.span
        aria-hidden="true"
        animate={{ rotate: open ? 45 : 0 }}
        className="ml-2 grid size-20 shrink-0 place-items-center"
        transition={reducedMotion ? { duration: 0 } : { duration: 0.16 }}
      >
        <PlusIcon />
      </motion.span>
    </button>
  )
}

function FoldExpandedDetails({
  candidate,
  mediaLayoutId,
  onOpenMap,
  saveError,
  saveDisabled,
  saved,
  section,
  tabsId,
  onSectionChange,
  onToggleSave,
}: {
  readonly candidate: RenderableCandidate
  readonly mediaLayoutId: string
  readonly onOpenMap: (() => void) | undefined
  readonly saveError: boolean
  readonly saveDisabled: boolean
  readonly saved: boolean
  readonly section: CandidateSection
  readonly tabsId: string
  readonly onSectionChange: (section: CandidateSection) => void
  readonly onToggleSave: () => void
}) {
  const saveErrorId = `${tabsId}-shortlist-error`

  return (
    <div className="px-14 pb-14">
      <CandidateMedia candidate={candidate} compact layoutId={mediaLayoutId} />
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
      <div className="mt-12 flex gap-8">
        <button
          aria-describedby={saveError ? saveErrorId : undefined}
          aria-pressed={saved}
          className={`min-h-40 flex-1 rounded-10 px-14 text-label-small transition-opacity disabled:cursor-wait disabled:opacity-55 ${
            saved ? 'bg-accent-black text-white' : 'bg-heat-100 text-white'
          }`}
          disabled={saveDisabled}
          title={
            saveDisabled ? 'Available when this response finishes' : undefined
          }
          type="button"
          onClick={onToggleSave}
        >
          {saved ? 'On the shortlist' : 'Add to shortlist'}
        </button>
        {onOpenMap ? (
          <button
            className="min-h-40 shrink-0 rounded-10 border-1 border-border-muted px-14 text-label-small text-accent-black transition-colors duration-4 hover:border-heat-100 hover:text-heat-100"
            type="button"
            onClick={onOpenMap}
          >
            Go there
          </button>
        ) : null}
      </div>
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
  return <Plus aria-hidden className="size-16" weight="regular" />
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
    <motion.div
      className="h-52 w-64 shrink-0 overflow-hidden rounded-8 bg-black/4"
      layoutId={layoutId}
      style={{ borderRadius: 8 }}
      transition={reducedMotion ? { duration: 0 } : foldSpring}
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
    </motion.div>
  )
}
