import { AnimatePresence, m, useReducedMotion } from 'motion/react'

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

  return (
    <m.div
      aria-labelledby={`${idBase}-tab-${section}`}
      className="relative min-h-176 overflow-hidden"
      id={`${idBase}-panel`}
      layout="size"
      role="tabpanel"
      tabIndex={0}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: 'spring', bounce: 0, duration: 0.32 }
      }
    >
      <AnimatePresence initial={false} mode="popLayout">
        <m.div
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
          <SectionContent
            candidate={candidate}
            idBase={idBase}
            section={section}
          />
        </m.div>
      </AnimatePresence>
    </m.div>
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
          {candidate.evidence.map((finding) => {
            const sources = candidate.sources.filter((source) =>
              finding.sourceRefs.includes(source.ref),
            )

            return (
              <div
                key={`${finding.claim}-${finding.finding}`}
                className="grid grid-cols-1 gap-8 py-10 md:grid-cols-[minmax(96px,0.65fr)_1fr] md:gap-14"
              >
                <div>
                  <p className="text-label-small">{finding.claim}</p>
                  <p
                    className={`mt-2 font-mono text-mono-x-small ${evidenceStatusClass(finding.status)}`}
                  >
                    {finding.status}
                  </p>
                </div>
                <div>
                  <p className="text-body-small text-pretty text-foreground-muted">
                    {finding.finding}
                  </p>
                  {sources.length > 0 ? (
                    <div className="mt-7 flex flex-wrap gap-x-10 gap-y-5">
                      {sources.map((source) => (
                        <a
                          key={source.ref}
                          className="inline-flex min-h-24 items-center gap-4 font-mono text-mono-x-small text-heat-100 underline decoration-heat-100/30 underline-offset-3 hover:decoration-heat-100"
                          href={source.url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {source.label}
                          <ExternalLinkIcon />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
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
