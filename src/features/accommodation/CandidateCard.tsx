import { useId, useState } from 'react'

import type { CandidateSnapshot } from '../../../shared/foundTools'
import { CandidateDetails } from './CandidateDetails'
import { CandidateMedia } from './CandidateMedia'
import { CandidateSectionTabs } from './CandidateSectionTabs'
import type { CandidateSection } from './candidatePresentation'
import { formatCandidatePrice } from './candidatePresentation'

interface CandidateCardProps {
  readonly candidate: CandidateSnapshot
  readonly saved: boolean
  readonly onToggleSave: () => void
}

export function CandidateCard({
  candidate,
  saved,
  onToggleSave,
}: CandidateCardProps) {
  const [section, setSection] = useState<CandidateSection>('glance')
  const tabsId = useId()
  const price = formatCandidatePrice(candidate.price)

  return (
    <article className="overflow-hidden rounded-16 bg-background-lighter shadow-[0_0_0_1px_rgb(38_38_38/0.08),0_2px_4px_rgb(38_38_38/0.04),0_16px_44px_rgb(38_38_38/0.06)]">
      <div className="relative">
        <CandidateMedia candidate={candidate} />
        <button
          aria-label={saved ? 'Remove from shortlist' : 'Add to shortlist'}
          aria-pressed={saved}
          className={`absolute top-12 right-12 grid size-44 place-items-center rounded-full shadow-[0_1px_3px_rgb(38_38_38/0.14)] transition-transform active:scale-[0.96] ${
            saved ? 'bg-heat-100 text-white' : 'bg-white text-accent-black'
          }`}
          type="button"
          onClick={onToggleSave}
        >
          {saved ? <CheckIcon /> : <PlusIcon />}
        </button>
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
