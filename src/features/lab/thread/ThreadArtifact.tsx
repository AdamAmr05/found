import { AnimatePresence, motion } from 'motion/react'
import type { Candidate } from '../candidates'
import { euros, relativeTime } from '../candidates'
import { CheckIcon, PlusIcon, RouteIcon, SourceIcon } from '../icons'
import { revealTransition, settleTransition, snapTransition } from '../motion'
import {
  CostReadout,
  EvidenceMeter,
  Meta,
  StatusDot,
  claimText,
  claimWord,
} from '../primitives'

export type ArtifactResolution = 'glance' | 'open' | 'sources'

const resolutions = [
  { id: 'glance', label: 'Glance' },
  { id: 'open', label: 'Open' },
  { id: 'sources', label: 'Sources' },
] as const satisfies readonly {
  readonly id: ArtifactResolution
  readonly label: string
}[]

/**
 * An artifact as it appears inside the thread. The message holds a reference
 * and nothing else: resolution, shortlist state and evidence are read live from
 * the artifact itself. Two messages that mention the same place are two views
 * of one object, so changing it in the newest message changes what the oldest
 * message is showing too — the thread becomes a record of how the understanding
 * sharpened rather than a pile of screenshots of what it used to be.
 */
export function ThreadArtifact({
  candidate,
  isLinked,
  isSaved,
  occurrenceId,
  onHoverChange,
  onResolutionChange,
  onToggleSave,
  resolution,
}: {
  readonly candidate: Candidate
  readonly isLinked: boolean
  readonly isSaved: boolean
  readonly occurrenceId: string
  readonly onHoverChange: (isHovering: boolean) => void
  readonly onResolutionChange: (next: ArtifactResolution) => void
  readonly onToggleSave: () => void
  readonly resolution: ArtifactResolution
}) {
  return (
    <motion.article
      className="relative overflow-hidden bg-background-lighter shadow-[0_0_0_1px_rgb(38_38_38/0.08)]"
      layout
      onHoverEnd={() => onHoverChange(false)}
      onHoverStart={() => onHoverChange(true)}
      style={{ borderRadius: resolution === 'glance' ? 12 : 16 }}
      transition={settleTransition}
    >
      {isLinked ? (
        <motion.span
          animate={{ opacity: 1 }}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
          initial={{ opacity: 0 }}
          style={{
            borderRadius: resolution === 'glance' ? 12 : 16,
            boxShadow: 'inset 0 0 0 1px rgb(250 93 25 / 0.55)',
          }}
          transition={revealTransition}
        />
      ) : null}

      <motion.header
        className="flex items-center gap-12 p-12"
        layout="position"
      >
        <motion.span
          className="size-40 shrink-0 overflow-hidden bg-black/8"
          layout
          style={{ borderRadius: 8 }}
          transition={settleTransition}
        >
          <img
            alt=""
            className="size-full object-cover"
            loading="lazy"
            src={candidate.imageUrl}
          />
        </motion.span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-label-small">
            {candidate.name}
          </span>
          <span className="block truncate text-label-x-small text-foreground-muted">
            {candidate.area}
          </span>
        </span>

        <EvidenceMeter candidate={candidate} className="hidden w-56 sm:flex" />
        <CostReadout candidate={candidate} />

        <motion.button
          aria-label={
            isSaved
              ? `Remove ${candidate.name} from the shortlist`
              : `Add ${candidate.name} to the shortlist`
          }
          className={`grid size-32 shrink-0 place-items-center rounded-8 ${
            isSaved ? 'bg-accent-black text-white' : 'bg-black/5'
          } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100`}
          onClick={onToggleSave}
          type="button"
          whileTap={{ scale: 0.94 }}
        >
          {isSaved ? (
            <CheckIcon className="size-14" />
          ) : (
            <PlusIcon className="size-14" />
          )}
        </motion.button>
      </motion.header>

      <AnimatePresence initial={false}>
        {resolution === 'glance' ? null : (
          <motion.div
            key="body"
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={settleTransition}
          >
            <div className="px-12 pb-12">
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={resolution}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  initial={{ opacity: 0, y: 4 }}
                  transition={revealTransition}
                >
                  {resolution === 'open' ? (
                    <OpenBody candidate={candidate} />
                  ) : (
                    <SourcesBody candidate={candidate} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.footer
        className="flex items-center gap-8 border-t-1 border-border-faint px-12 py-8"
        layout="position"
      >
        <fieldset className="flex gap-3 rounded-8 bg-black/4 p-3">
          <legend className="sr-only">Resolution for {candidate.name}</legend>
          {resolutions.map((entry) => {
            const isActive = entry.id === resolution

            return (
              <button
                key={entry.id}
                aria-pressed={isActive}
                className="relative min-h-26 rounded-6 px-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
                onClick={() => onResolutionChange(entry.id)}
                type="button"
              >
                {isActive ? (
                  <motion.span
                    className="absolute inset-0 rounded-6 bg-background-lighter shadow-[0_1px_2px_rgb(38_38_38/0.12)]"
                    layoutId={`resolution-${occurrenceId}`}
                    transition={snapTransition}
                  />
                ) : null}
                <span
                  className={`relative z-10 text-label-x-small ${
                    isActive ? 'text-accent-black' : 'text-foreground-muted'
                  }`}
                >
                  {entry.label}
                </span>
              </button>
            )
          })}
        </fieldset>
        <Meta>checked {relativeTime(candidate.checkedMinutesAgo)}</Meta>
      </motion.footer>
    </motion.article>
  )
}

function OpenBody({ candidate }: { readonly candidate: Candidate }) {
  return (
    <div>
      <div className="relative h-160 overflow-hidden rounded-10 bg-black/6">
        <img
          alt={candidate.imageAlt}
          className="size-full object-cover"
          loading="lazy"
          src={candidate.imageUrl}
        />
        <span className="absolute right-10 bottom-10 flex items-center gap-6 rounded-full bg-white/92 px-10 py-5 font-mono text-mono-x-small text-accent-black">
          <RouteIcon className="size-13" />
          {candidate.commuteMinutes} min · {candidate.commuteLabel}
        </span>
      </div>
      <ul className="mt-10 divide-y-1 divide-border-faint">
        {candidate.claims.map((claim) => (
          <li
            key={claim.requirement}
            className="flex items-baseline justify-between gap-12 py-7"
          >
            <span className="flex min-w-0 items-baseline gap-8">
              <StatusDot
                className="size-6 translate-y-[-2px]"
                status={claim.status}
              />
              <span className="truncate text-body-medium">
                {claim.requirement}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block text-body-small">
                {claim.confirmed ?? claim.claimed}
              </span>
              <span className={`text-label-x-small ${claimText[claim.status]}`}>
                {claimWord[claim.status]}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SourcesBody({ candidate }: { readonly candidate: Candidate }) {
  return (
    <div>
      <div className="flex items-center gap-8 rounded-8 bg-heat-8 px-10 py-8">
        <SourceIcon className="size-14 text-heat-100" />
        <span className="text-label-x-small">
          {candidate.sourceCount} sources · deposit {euros(candidate.deposit)}
        </span>
      </div>
      <ul className="mt-8 divide-y-1 divide-border-faint">
        {candidate.claims.map((claim) => (
          <li key={claim.requirement} className="py-8">
            <div className="flex items-center gap-8">
              <StatusDot className="size-6" status={claim.status} />
              <span className="text-label-x-small">{claim.requirement}</span>
              <span className={`text-label-x-small ${claimText[claim.status]}`}>
                · {claimWord[claim.status]}
              </span>
            </div>
            <p className="mt-2 pl-14 font-mono text-mono-x-small text-foreground-muted">
              {claim.provenance}
              {claim.verifiedMinutesAgo === null
                ? ''
                : ` · read ${relativeTime(claim.verifiedMinutesAgo)}`}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
