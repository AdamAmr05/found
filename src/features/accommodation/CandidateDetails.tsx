import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'

import type { CandidateSnapshot } from '../../../shared/foundTools'
import type { CandidateSection } from './candidatePresentation'
import { evidenceStatusClass, factSignalClass } from './candidatePresentation'

interface CandidateDetailsProps {
  readonly candidate: CandidateSnapshot
  readonly idBase: string
  readonly section: CandidateSection
}

export function CandidateDetails({
  candidate,
  idBase,
  section,
}: CandidateDetailsProps) {
  const reducedMotion = useReducedMotion()
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentHeight, setContentHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return

    const measure = () =>
      setContentHeight(content.getBoundingClientRect().height)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(content)
    return () => observer.disconnect()
  }, [section])

  return (
    <div
      aria-labelledby={`${idBase}-tab-${section}`}
      id={`${idBase}-panel`}
      role="tabpanel"
      tabIndex={0}
    >
      <motion.div
        animate={{ height: contentHeight ?? 'auto' }}
        className="overflow-hidden"
        initial={false}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 340, damping: 36 }
        }
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={section}
            ref={contentRef}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: reducedMotion ? 0 : -4,
              transition: { duration: reducedMotion ? 0 : 0.08 },
            }}
            initial={{ opacity: 0, y: reducedMotion ? 0 : 5 }}
            transition={{
              delay: reducedMotion ? 0 : 0.06,
              duration: reducedMotion ? 0 : 0.16,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <SectionContent candidate={candidate} section={section} />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function SectionContent({
  candidate,
  section,
}: Pick<CandidateDetailsProps, 'candidate' | 'section'>) {
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
    const uniqueSources = [
      ...new Map(
        candidate.sources.map((source) => [source.url, source] as const),
      ).values(),
    ]

    return (
      <div>
        <div className="divide-y-1 divide-border-faint">
          {candidate.evidence.map((finding) => (
            <div
              key={`${finding.claim}-${finding.finding}`}
              className="grid grid-cols-1 gap-8 py-10 first:pt-0 md:grid-cols-[minmax(96px,0.65fr)_1fr] md:gap-14"
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
              No supporting details were included in this result.
            </p>
          ) : null}
        </div>
        <div className="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-border-faint pt-10">
          {uniqueSources.map((source) => (
            <a
              key={source.ref}
              className="inline-flex items-center gap-4 font-mono text-mono-x-small text-heat-100 underline decoration-heat-100/30 underline-offset-3 hover:decoration-heat-100"
              href={source.url}
              rel="noreferrer"
              target="_blank"
            >
              {source.label}
              <ExternalLinkIcon />
            </a>
          ))}
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

function ExternalLinkIcon() {
  return (
    <svg aria-hidden className="size-11" viewBox="0 0 12 12">
      <path
        d="M4 2.5H2.5v7h7V8M6 2.5h3.5V6M9.25 2.75 5.5 6.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1"
      />
    </svg>
  )
}
