import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import type { Candidate, CandidateId } from '../candidates'
import { euros, relativeTime } from '../candidates'
import { CheckIcon, PlusIcon, RouteIcon, SourceIcon } from '../icons'
import { revealTransition, settleTransition, travel } from '../motion'
import {
  CostReadout,
  EvidenceMeter,
  Meta,
  StatusDot,
  claimText,
  claimWord,
} from '../primitives'
import type { VariantProps } from '../variantContract'

/**
 * Fold. The candidate is a line until it is worth more than a line. Opening it
 * does not navigate anywhere: the same row grows into the decision artifact and
 * the thumbnail becomes the hero, so the object never loses its place.
 */
export function FoldList({
  candidates,
  focusedId,
  onFocus,
  savedIds,
  onToggleSave,
}: VariantProps) {
  const [openId, setOpenId] = useState<CandidateId | null>(focusedId)

  const open = (candidate: Candidate) => {
    const next = openId === candidate.id ? null : candidate.id
    setOpenId(next)
    onFocus(candidate.id)
  }

  return (
    <ul className="flex flex-col gap-8">
      {candidates.map((candidate) => (
        <li key={candidate.id}>
          <FoldRow
            candidate={candidate}
            isOpen={openId === candidate.id}
            isFocused={focusedId === candidate.id}
            isSaved={savedIds.includes(candidate.id)}
            onOpen={() => open(candidate)}
            onToggleSave={() => onToggleSave(candidate.id)}
          />
        </li>
      ))}
    </ul>
  )
}

interface FoldRowProps {
  readonly candidate: Candidate
  readonly isOpen: boolean
  readonly isFocused: boolean
  readonly isSaved: boolean
  readonly onOpen: () => void
  readonly onToggleSave: () => void
}

function FoldRow({
  candidate,
  isOpen,
  isFocused,
  isSaved,
  onOpen,
  onToggleSave,
}: FoldRowProps) {
  const prefersReducedMotion = useReducedMotion()
  const mediaId = `fold-media-${candidate.id}`

  return (
    <motion.article
      animate={{ borderRadius: isOpen ? 16 : 12 }}
      className="relative overflow-hidden bg-background-lighter shadow-[0_0_0_1px_rgb(38_38_38/0.07),0_1px_2px_rgb(38_38_38/0.04)]"
      data-testid={`fold-row-${candidate.id}`}
      initial={false}
      transition={settleTransition}
    >
      <motion.span
        animate={{ opacity: isFocused ? 1 : 0 }}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20"
        initial={false}
        style={{
          borderRadius: 'inherit',
          boxShadow: 'inset 0 0 0 1px rgb(250 93 25 / 0.5)',
        }}
        transition={revealTransition}
      />

      <motion.button
        aria-expanded={isOpen}
        className="flex w-full items-center gap-14 px-14 py-12 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-heat-100"
        onClick={onOpen}
        type="button"
      >
        {isOpen ? null : (
          <motion.div
            className="size-44 shrink-0 overflow-hidden bg-black/6"
            layoutId={mediaId}
            style={{ borderRadius: 8 }}
            transition={settleTransition}
          >
            <img
              alt=""
              className="size-full object-cover"
              loading="lazy"
              src={candidate.imageUrl}
            />
          </motion.div>
        )}

        <motion.div className="min-w-0 flex-1" layout="position">
          <p className="truncate text-label-medium">{candidate.name}</p>
          <p className="truncate text-body-small text-foreground-muted">
            {candidate.area}
          </p>
        </motion.div>

        <motion.div className="hidden w-96 sm:block" layout="position">
          <EvidenceMeter candidate={candidate} />
          <p className="mt-6 text-label-x-small text-foreground-muted">
            {candidate.sourceCount} sources
          </p>
        </motion.div>

        <motion.div layout="position">
          <CostReadout candidate={candidate} />
        </motion.div>
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          /*
           * This height is the fold's only geometry animation. Transforming the
           * bordered article distorts its one-pixel edge and rounded corners.
           */
          <motion.div
            key="body"
            animate={{ height: 'auto' }}
            className="overflow-hidden"
            exit={{ height: 0 }}
            initial={{ height: 0 }}
            style={{ transformOrigin: 'top' }}
            transition={settleTransition}
          >
            <FoldBody
              candidate={candidate}
              isSaved={isSaved}
              mediaId={mediaId}
              prefersReducedMotion={prefersReducedMotion}
              onToggleSave={onToggleSave}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  )
}

interface FoldBodyProps {
  readonly candidate: Candidate
  readonly isSaved: boolean
  readonly mediaId: string
  readonly prefersReducedMotion: boolean | null
  readonly onToggleSave: () => void
}

function FoldBody({
  candidate,
  isSaved,
  mediaId,
  prefersReducedMotion,
  onToggleSave,
}: FoldBodyProps) {
  return (
    <div className="px-14 pb-14">
      <motion.div
        className="relative h-190 overflow-hidden bg-black/6"
        layoutId={mediaId}
        style={{ borderRadius: 12 }}
        transition={settleTransition}
      >
        <img
          alt={candidate.imageAlt}
          className="size-full object-cover"
          loading="lazy"
          src={candidate.imageUrl}
        />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-12 bg-gradient-to-t from-black/56 to-transparent p-12 pt-40">
          <p className="max-w-360 text-body-small text-balance text-white">
            {candidate.headline}
          </p>
          <span className="rounded-full bg-white/92 px-10 py-5 font-mono text-mono-x-small whitespace-nowrap text-accent-black">
            {candidate.commuteMinutes} min · {candidate.commuteLabel}
          </span>
        </div>
      </motion.div>

      <motion.ul
        animate="visible"
        className="mt-12 divide-y-1 divide-border-faint"
        initial="hidden"
        transition={{ delayChildren: 0.06, staggerChildren: 0.035 }}
      >
        {candidate.claims.map((claim) => (
          <motion.li
            key={claim.requirement}
            className="grid grid-cols-[1fr_auto] items-baseline gap-12 py-9"
            variants={{
              hidden: {
                opacity: 0,
                y: travel(prefersReducedMotion, 6),
              },
              visible: { opacity: 1, y: 0, transition: revealTransition },
            }}
          >
            <div className="flex min-w-0 items-baseline gap-9">
              <StatusDot
                className="size-7 translate-y-[-2px]"
                status={claim.status}
              />
              <span className="truncate text-body-medium">
                {claim.requirement}
              </span>
            </div>
            <div className="text-right">
              <p className="text-body-small">
                {claim.confirmed ?? claim.claimed}
              </p>
              <p className={`text-label-x-small ${claimText[claim.status]}`}>
                {claimWord[claim.status]}
              </p>
            </div>
          </motion.li>
        ))}
      </motion.ul>

      <div className="mt-12 flex flex-wrap items-center gap-8">
        <span className="flex min-h-32 items-center gap-8 rounded-8 bg-heat-8 px-10">
          <SourceIcon className="size-14 text-heat-100" />
          <Meta>checked {relativeTime(candidate.checkedMinutesAgo)}</Meta>
        </span>
        <span className="flex min-h-32 items-center gap-8 rounded-8 bg-black/4 px-10">
          <RouteIcon className="size-14 text-foreground-muted" />
          <Meta>deposit {euros(candidate.deposit)}</Meta>
        </span>
        <motion.button
          className={`ml-auto flex min-h-36 items-center gap-8 rounded-10 px-14 text-label-small ${
            isSaved
              ? 'bg-accent-black text-white'
              : 'bg-heat-100 text-white shadow-[0_2px_6px_rgb(250_93_25/0.24)]'
          } focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100`}
          onClick={onToggleSave}
          type="button"
          whileTap={{ scale: 0.97 }}
        >
          {isSaved ? (
            <CheckIcon className="size-15" />
          ) : (
            <PlusIcon className="size-15" />
          )}
          {isSaved ? 'On the shortlist' : 'Add to shortlist'}
        </motion.button>
      </div>
    </div>
  )
}
