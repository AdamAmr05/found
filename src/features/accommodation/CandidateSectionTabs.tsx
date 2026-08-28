import { motion } from 'motion/react'

import type { CandidateSection } from './candidatePresentation'
import { candidateSections } from './candidatePresentation'

interface CandidateSectionTabsProps {
  readonly candidateRef: string
  readonly section: CandidateSection
  readonly onChange: (section: CandidateSection) => void
}

export function CandidateSectionTabs({
  candidateRef,
  section,
  onChange,
}: CandidateSectionTabsProps) {
  return (
    <div
      aria-label="Candidate information"
      className="grid grid-cols-3 rounded-8 bg-black/4 p-3"
      role="tablist"
    >
      {candidateSections.map((item) => {
        const active = section === item.id
        return (
          <button
            key={item.id}
            aria-selected={active}
            className="relative min-h-42 rounded-6 px-7 text-label-small focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
            role="tab"
            type="button"
            onClick={() => onChange(item.id)}
          >
            {active ? (
              <motion.span
                className="absolute inset-0 rounded-6 bg-white shadow-[0_1px_3px_rgb(38_38_38/0.1)]"
                layoutId={`candidate-section-${candidateRef}`}
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            ) : null}
            <span
              className={`relative z-10 ${
                active ? 'text-accent-black' : 'text-foreground-muted'
              }`}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
