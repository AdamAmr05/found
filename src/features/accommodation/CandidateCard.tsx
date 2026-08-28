import { useId, useState } from 'react'

import type { CandidateSnapshot } from '../../../shared/foundTools'
import { CandidateDetails } from './CandidateDetails'
import { CandidateMedia } from './CandidateMedia'
import { CandidateSectionTabs } from './CandidateSectionTabs'
import type { CandidateSection } from './candidatePresentation'
import { formatCandidatePrice } from './candidatePresentation'

interface CandidateCardProps {
  readonly candidate: CandidateSnapshot
  readonly saveError: boolean
  readonly saved: boolean
  readonly onToggleSave: () => void
}

export function CandidateCard({
  candidate,
  saveError,
  saved,
  onToggleSave,
}: CandidateCardProps) {
  const [section, setSection] = useState<CandidateSection>('glance')
  const tabsId = useId()
  const saveErrorId = `${tabsId}-shortlist-error`
  const price = formatCandidatePrice(candidate.price)

  return (
    <article className="overflow-hidden rounded-16 bg-background-lighter shadow-surface-compact">
      <div className="relative">
        <CandidateMedia candidate={candidate} />
        <button
          aria-label={saved ? 'Remove from shortlist' : 'Add to shortlist'}
          aria-describedby={saveError ? saveErrorId : undefined}
          aria-pressed={saved}
          className={`absolute top-12 right-12 grid size-44 place-items-center rounded-full shadow-[0_1px_3px_rgb(38_38_38/0.14)] transition-transform active:scale-[0.96] ${
            saved ? 'bg-heat-100 text-white' : 'bg-white text-accent-black'
          }`}
          type="button"
          onClick={onToggleSave}
        >
          {saved ? <CheckIcon /> : <PlusIcon />}
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
            <p className="mt-3 text-body-small text-foreground-muted">
              {candidate.location.label}
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

function PlusIcon() {
  return (
    <svg aria-hidden className="size-20" viewBox="0 0 20 20">
      <path
        d="M10 4v12M4 10h12"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.75"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden className="size-20" viewBox="0 0 20 20">
      <path
        d="m5 10 3 3 7-7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  )
}
