import { Check, MapPin, Plus } from '@phosphor-icons/react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useId, useState } from 'react'

import { CandidateDetails } from './CandidateDetails'
import { CandidateMedia } from './CandidateMedia'
import { CandidateSectionTabs } from './CandidateSectionTabs'
import type { RenderableCandidate } from './candidateMediaCatalog'
import type { CandidateSection } from './candidatePresentation'
import { formatCandidatePrice } from './candidatePresentation'

interface CandidateCardProps {
  readonly candidate: RenderableCandidate
  readonly layoutScope: string
  readonly mapHighlighted?: boolean
  readonly saveError: boolean
  readonly saveDisabled: boolean
  readonly saved: boolean
  readonly onOpenMap?: (() => void) | undefined
  readonly onToggleSave: () => void
}

export function CandidateCard({
  candidate,
  layoutScope,
  mapHighlighted = false,
  saveError,
  saveDisabled,
  saved,
  onOpenMap,
  onToggleSave,
}: CandidateCardProps) {
  const [section, setSection] = useState<CandidateSection>('glance')
  const tabsId = useId()
  const saveErrorId = `${tabsId}-shortlist-error`
  const price = formatCandidatePrice(candidate.price)
  const reducedMotion = useReducedMotion()
  const mediaLayoutId = `${layoutScope}-${candidate.ref}-media`

  return (
    <article
      className={`overflow-hidden rounded-16 bg-background-lighter shadow-surface-artifact ${
        mapHighlighted ? 'outline-2 outline-offset-2 outline-heat-100' : ''
      }`}
    >
      <div className="relative">
        <CandidateMedia candidate={candidate} layoutId={mediaLayoutId} />
        <button
          aria-label={
            saveDisabled
              ? 'Add to shortlist after this response finishes'
              : saved
                ? 'Remove from shortlist'
                : 'Add to shortlist'
          }
          aria-describedby={saveError ? saveErrorId : undefined}
          aria-pressed={saved}
          className={`absolute top-12 right-12 grid size-44 place-items-center rounded-full shadow-[0_1px_3px_rgb(38_38_38/0.14)] transition-[opacity,transform] active:scale-[0.96] disabled:cursor-wait disabled:opacity-55 disabled:active:scale-100 ${
            saved ? 'bg-heat-100 text-white' : 'bg-white text-accent-black'
          }`}
          disabled={saveDisabled}
          title={
            saveDisabled ? 'Available when this response finishes' : undefined
          }
          type="button"
          onClick={onToggleSave}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {saved ? (
              <motion.span
                key="saved"
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                className="grid size-26 place-items-center rounded-full bg-heat-100 text-white"
                exit={{ opacity: 0, rotate: -12, scale: 0.4 }}
                initial={{ opacity: 0, rotate: 12, scale: 0.4 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 520, damping: 28 }
                }
              >
                <CheckIcon />
              </motion.span>
            ) : (
              <motion.span
                key="add"
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                className="grid size-24 place-items-center"
                exit={{ opacity: 0, rotate: 12, scale: 0.4 }}
                initial={{ opacity: 0, rotate: -12, scale: 0.4 }}
                transition={
                  reducedMotion
                    ? { duration: 0 }
                    : { type: 'spring', stiffness: 520, damping: 28 }
                }
              >
                <PlusIcon />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        {saveError ? (
          <p
            className="absolute top-64 right-12 max-w-180 rounded-8 bg-white px-10 py-7 text-label-x-small text-accent-crimson shadow-[0_1px_4px_rgb(38_38_38/0.14)]"
            id={saveErrorId}
            role="alert"
          >
            Couldn’t update shortlist. Try again.
          </p>
        ) : null}
      </div>
      <div className="p-18 md:p-20">
        <div className="flex items-start justify-between gap-18">
          <div className="min-w-0">
            <h2 className="text-title-h5 text-balance">{candidate.title}</h2>
            <p className="mt-3 flex items-center gap-8 text-body-small text-foreground-muted">
              <span className="truncate">{candidate.location.label}</span>
              {onOpenMap ? (
                <button
                  className="inline-flex shrink-0 items-center gap-5 rounded-full border-1 border-border-faint px-9 py-2 text-label-x-small transition-colors duration-4 hover:border-heat-100 hover:text-heat-100"
                  onClick={onOpenMap}
                  type="button"
                >
                  <MapPinIcon />
                  Go there
                </button>
              ) : null}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-mono-medium tabular-nums">
              {price?.amount ?? 'Price unknown'}
            </p>
            {price ? (
              <p className="text-body-small text-foreground-muted">
                {price.detail}
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-18">
          <CandidateSectionTabs
            idBase={tabsId}
            section={section}
            onChange={setSection}
          />
        </div>
        <div className="mt-18">
          <CandidateDetails
            candidate={candidate}
            idBase={tabsId}
            section={section}
          />
        </div>
      </div>
    </article>
  )
}

function MapPinIcon() {
  return <MapPin aria-hidden className="size-12" weight="regular" />
}

function PlusIcon() {
  return <Plus aria-hidden className="size-20" weight="regular" />
}

function CheckIcon() {
  return <Check aria-hidden className="size-20" weight="regular" />
}
