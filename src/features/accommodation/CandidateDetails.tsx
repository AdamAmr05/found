import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'

import type { CandidateSnapshot } from '../../../shared/foundTools'
import type { CandidateSection } from './candidatePresentation'
import { evidenceStatusClass, factSignalClass } from './candidatePresentation'

interface CandidateDetailsProps {
  readonly candidate: CandidateSnapshot
  readonly section: CandidateSection
}

const MINIMUM_DETAILS_HEIGHT = 176

export function CandidateDetails({
  candidate,
  section,
}: CandidateDetailsProps) {
  const reducedMotion = useReducedMotion()
  const contentRef = useRef<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState(MINIMUM_DETAILS_HEIGHT)

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return

    function measure(): void {
      if (!content) return
      setContentHeight(
        Math.max(
          MINIMUM_DETAILS_HEIGHT,
          Math.ceil(content.getBoundingClientRect().height),
        ),
      )
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [section])

  return (
    <motion.div
      animate={{ height: contentHeight }}
      className="relative overflow-hidden"
      initial={false}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: 'spring', bounce: 0, duration: 0.32 }
      }
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          ref={contentRef}
          key={section}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -3 }}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 4 }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { type: 'spring', bounce: 0, duration: 0.22 }
          }
        >
          <SectionContent candidate={candidate} section={section} />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

function SectionContent({ candidate, section }: CandidateDetailsProps) {
  if (section === 'glance') {
    return (
      <div>
        <p className="text-body-medium text-pretty text-foreground-muted">
          {candidate.atAGlance.summary}
        </p>
        <dl className="mt-14 divide-y-1 divide-border-faint">
          {candidate.atAGlance.facts.map((fact) => (
            <div
              key={`${fact.label}-${fact.value}`}
              className="flex min-h-42 items-center justify-between gap-16 py-8"
            >
              <dt className="flex items-center gap-9 text-body-medium">
                <span
                  aria-hidden="true"
                  className={`size-7 rounded-full ${factSignalClass(fact.signal)}`}
                />
                {fact.label}
              </dt>
              <dd className="text-right text-body-small text-foreground-muted">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    )
  }

  if (section === 'evidence') {
    return (
      <div>
        <div className="flex items-center justify-between rounded-8 bg-heat-8 px-12 py-10">
          <span className="text-label-small">
            {candidate.sources.length} source
            {candidate.sources.length === 1 ? '' : 's'} connected
          </span>
          <span className="font-mono text-mono-x-small text-foreground-muted">
            claim-level evidence
          </span>
        </div>
        <div className="mt-8 divide-y-1 divide-border-faint">
          {candidate.evidence.map((finding) => (
            <div
              key={`${finding.claim}-${finding.finding}`}
              className="grid grid-cols-[minmax(96px,0.65fr)_1fr] gap-14 py-10"
            >
              <div>
                <p className="text-label-small">{finding.claim}</p>
                <p
                  className={`mt-2 font-mono text-mono-x-small ${evidenceStatusClass(finding.status)}`}
                >
                  {finding.status}
                </p>
              </div>
              <p className="text-body-small text-pretty text-foreground-muted">
                {finding.finding}
              </p>
            </div>
          ))}
          {candidate.evidence.length === 0 ? (
            <p className="py-12 text-body-small text-foreground-muted">
              No claim-level evidence was included in this snapshot.
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-12 bg-accent-black p-16 text-white">
      <p className="font-mono text-mono-x-small text-white/56">NEXT MOVE</p>
      <p className="mt-9 text-body-large text-pretty">
        {candidate.nextMove.summary}
      </p>
      {candidate.contact ? (
        <p className="mt-14 text-body-small text-white/64">
          A contact route is available. Nothing will be sent without approval.
        </p>
      ) : null}
    </div>
  )
}
