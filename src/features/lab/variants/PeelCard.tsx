import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useTransform,
} from 'motion/react'
import { useState } from 'react'
import type { Candidate } from '../candidates'
import { euros, relativeTime } from '../candidates'
import { CheckIcon, GripIcon, PlusIcon, SourceIcon } from '../icons'
import { releaseTransition, settleTransition } from '../motion'
import {
  CostReadout,
  Meta,
  StatusDot,
  claimText,
  claimWord,
} from '../primitives'
import type { VariantProps } from '../variantContract'
import { CandidateChips } from './CandidateChips'

/** How far the listing folds back, in pixels. The evidence column is this wide. */
const foldWidth = 300

/** The rolled edge of the lifted layer. Constant, the way a real curl is. */
const curlWidth = 26

/** Past this much travel, releasing commits the fold instead of returning it. */
const commitDistance = 116
const commitVelocity = 380

/**
 * Peel. A listing is a claim until something else confirms it. Rather than
 * putting citations in a tab, the presentation layer is literally lifted off
 * the sources underneath: the fold follows the pointer 1:1 and stays half-open
 * if you leave it there, which is the honest state of most evidence.
 */
export function PeelCard({
  candidates,
  focusedId,
  onFocus,
  savedIds,
  onToggleSave,
}: VariantProps) {
  const candidate = candidates.find((entry) => entry.id === focusedId)

  if (!candidate) {
    throw new Error(`Peel variant lost its focus: ${focusedId}`)
  }

  return (
    <div>
      <CandidateChips
        candidates={candidates}
        focusedId={focusedId}
        onFocus={onFocus}
      />
      <PeelSurface
        key={candidate.id}
        candidate={candidate}
        isSaved={savedIds.includes(candidate.id)}
        onToggleSave={() => onToggleSave(candidate.id)}
      />
    </div>
  )
}

interface PeelSurfaceProps {
  readonly candidate: Candidate
  readonly isSaved: boolean
  readonly onToggleSave: () => void
}

function PeelSurface({ candidate, isSaved, onToggleSave }: PeelSurfaceProps) {
  const [isFolded, setIsFolded] = useState(false)
  const handleX = useMotionValue(0)
  const fold = useTransform(handleX, (value) => -value)
  const clipPath = useMotionTemplate`inset(0 ${fold}px 0 0)`
  const creaseOpacity = useTransform(fold, [0, 24], [0, 1])

  const settle = (open: boolean) => {
    setIsFolded(open)
    void animate(handleX, open ? -foldWidth : 0, releaseTransition)
  }

  return (
    <section
      aria-label={`${candidate.name}, listing and sources`}
      className="relative mt-16 h-340 min-w-320 overflow-hidden rounded-16 bg-accent-black shadow-[0_0_0_1px_rgb(38_38_38/0.08),0_18px_44px_rgb(38_38_38/0.08)]"
    >
      <EvidenceUnderside candidate={candidate} />

      <motion.div
        className="absolute inset-0 bg-background-lighter"
        style={{ clipPath }}
      >
        <ListingFace
          candidate={candidate}
          isSaved={isSaved}
          onToggleSave={onToggleSave}
        />
      </motion.div>

      {/*
        The lifted part curls at the crease rather than lying flat across the
        page, so the listing you are checking stays readable while its sources
        come out from underneath it.
      */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-y-0 rounded-l-8"
        style={{
          width: curlWidth,
          right: fold,
          opacity: creaseOpacity,
          background:
            'linear-gradient(270deg, #d9d5cf 0%, #ffffff 34%, #f2f0ec 72%, #e4e1db 100%)',
          boxShadow: '-12px 0 26px rgb(38 38 38 / 0.16)',
        }}
      />

      <motion.button
        aria-label="Fold the listing back to read its sources"
        aria-pressed={isFolded}
        className="absolute inset-y-0 right-0 grid w-30 cursor-grab place-items-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-heat-100 active:cursor-grabbing"
        drag="x"
        dragConstraints={{ left: -foldWidth, right: 0 }}
        dragElastic={0.03}
        dragMomentum={false}
        onClick={() => settle(!isFolded)}
        onDragEnd={(_event, info) => {
          const travelled = -handleX.get()
          settle(
            travelled > commitDistance || info.velocity.x < -commitVelocity,
          )
        }}
        style={{ x: handleX }}
        type="button"
      >
        <span className="grid h-56 w-22 place-items-center rounded-full bg-white/92 text-accent-black shadow-[0_1px_4px_rgb(38_38_38/0.2)]">
          <GripIcon className="size-14" />
        </span>
      </motion.button>
    </section>
  )
}

function ListingFace({ candidate, isSaved, onToggleSave }: PeelSurfaceProps) {
  return (
    <div className="flex h-full">
      <div className="relative w-1/3 min-w-160 shrink-0 overflow-hidden">
        <img
          alt={candidate.imageAlt}
          className="size-full object-cover"
          src={candidate.imageUrl}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-18">
        <div className="flex items-start justify-between gap-16">
          <div className="min-w-0">
            <h3 className="truncate text-title-h5">{candidate.name}</h3>
            <p className="truncate text-body-small text-foreground-muted">
              {candidate.area} · {candidate.city}
            </p>
          </div>
          <CostReadout candidate={candidate} />
        </div>

        <ul className="mt-14 divide-y-1 divide-border-faint">
          {candidate.claims.map((claim) => (
            <li
              key={claim.requirement}
              className="flex items-center justify-between gap-12 py-8"
            >
              <span className="flex min-w-0 items-center gap-9">
                <StatusDot status={claim.status} />
                <span className="truncate text-body-medium">
                  {claim.requirement}
                </span>
              </span>
              <span
                className={`shrink-0 text-label-x-small ${claimText[claim.status]}`}
              >
                {claimWord[claim.status]}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex items-center gap-10 pt-12">
          <Meta>{candidate.sourceCount} sources</Meta>
          <Meta>·</Meta>
          <Meta>deposit {euros(candidate.deposit)}</Meta>
          <motion.button
            className={`ml-auto flex min-h-34 items-center gap-8 rounded-10 px-12 text-label-small ${
              isSaved ? 'bg-accent-black text-white' : 'bg-black/5'
            } focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100`}
            onClick={onToggleSave}
            type="button"
            whileTap={{ scale: 0.97 }}
          >
            {isSaved ? (
              <CheckIcon className="size-14" />
            ) : (
              <PlusIcon className="size-14" />
            )}
            {isSaved ? 'Shortlisted' : 'Shortlist'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

function EvidenceUnderside({ candidate }: { readonly candidate: Candidate }) {
  return (
    <div
      className="absolute inset-y-0 right-0 flex flex-col p-18 text-white"
      style={{ width: foldWidth }}
    >
      <div className="flex items-center gap-8">
        <SourceIcon className="size-15 text-heat-100" />
        <p className="text-label-small">Underneath the listing</p>
      </div>
      <p className="mt-6 text-body-small text-white/56">
        What each status is actually resting on.
      </p>

      <motion.ul
        className="mt-14 flex-1 divide-y-1 divide-white/10"
        transition={settleTransition}
      >
        {candidate.claims.map((claim) => (
          <li key={claim.requirement} className="py-9">
            <div className="flex items-center gap-8">
              <StatusDot className="size-6" status={claim.status} />
              <p className="truncate text-label-x-small text-white/72">
                {claim.requirement}
              </p>
            </div>
            <p className="mt-3 font-mono text-mono-x-small text-white">
              {claim.provenance}
            </p>
          </li>
        ))}
      </motion.ul>

      <p className="font-mono text-mono-x-small text-white/56">
        refreshed {relativeTime(candidate.checkedMinutesAgo)}
      </p>
    </div>
  )
}
