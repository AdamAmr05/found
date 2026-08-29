import { motion, useReducedMotion } from 'motion/react'
import type { KeyboardEvent } from 'react'

import type { CandidateSection } from './candidatePresentation'
import { candidateSections } from './candidatePresentation'

interface CandidateSectionTabsProps {
  readonly idBase: string
  readonly section: CandidateSection
  readonly onChange: (section: CandidateSection) => void
}

export function CandidateSectionTabs({
  idBase,
  section,
  onChange,
}: CandidateSectionTabsProps) {
  const reducedMotion = useReducedMotion()
  const activeIndex = candidateSections.findIndex((item) => item.id === section)

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ): void {
    let nextIndex: number | undefined
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % candidateSections.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex =
        (index - 1 + candidateSections.length) % candidateSections.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = candidateSections.length - 1
    }

    if (nextIndex === undefined) return
    event.preventDefault()
    const nextSection = candidateSections[nextIndex]
    if (!nextSection) return
    onChange(nextSection.id)
    const tabs =
      event.currentTarget.parentElement?.querySelectorAll<HTMLElement>(
        '[role="tab"]',
      )
    tabs?.[nextIndex]?.focus()
  }

  return (
    // Candidate presentation deliberately has exactly three stable sections.
    // Changing that contract requires revisiting this grid and indicator.
    <div
      aria-label="Candidate information"
      className="relative grid grid-cols-3 rounded-8 bg-black/4 p-3"
      role="tablist"
    >
      <motion.span
        aria-hidden
        animate={{ x: `${activeIndex * 100}%` }}
        className="absolute inset-y-3 left-3 w-[calc((100%-6px)/3)] rounded-6 bg-white shadow-[0_1px_3px_rgb(38_38_38/0.1)]"
        initial={false}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 500, damping: 40 }
        }
      />
      {candidateSections.map((item, index) => {
        const active = section === item.id
        return (
          <button
            key={item.id}
            aria-controls={`${idBase}-panel`}
            aria-selected={active}
            className="relative min-h-42 rounded-6 px-7 text-label-small focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
            id={`${idBase}-tab-${item.id}`}
            role="tab"
            tabIndex={active ? 0 : -1}
            type="button"
            onKeyDown={(event) => handleKeyDown(event, index)}
            onClick={() => onChange(item.id)}
          >
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
