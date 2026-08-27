import { Reorder, motion, useDragControls } from 'motion/react'
import { useState } from 'react'
import type { Candidate } from '../candidates'
import { euros } from '../candidates'
import { CheckIcon, GripIcon, PlusIcon } from '../icons'
import { settleTransition, snapTransition } from '../motion'
import { FocusRing, Meta, StatusDot } from '../primitives'
import type { RankedCandidate } from '../ranking'
import { rankCandidates, requirementNames } from '../ranking'
import type { VariantProps } from '../variantContract'

/**
 * Ranked. The other variants let you sort the world; this one lets you edit the
 * question. Priorities are expressed as an order you drag rather than numbers
 * you invent, and the candidates re-rank underneath the movement, so you can
 * see what your own criteria are doing before you trust the result.
 */
export function RankedList({
  candidates,
  focusedId,
  onFocus,
  savedIds,
  onToggleSave,
}: VariantProps) {
  const [priorities, setPriorities] = useState<readonly string[]>(() =>
    requirementNames(candidates),
  )
  const [required, setRequired] = useState<readonly string[]>([])

  const ranked = rankCandidates(candidates, priorities, required)
  const surviving = ranked.filter((entry) => entry.ruledOutBy === null).length

  const toggleRequired = (requirement: string) =>
    setRequired((current) =>
      current.includes(requirement)
        ? current.filter((entry) => entry !== requirement)
        : [...current, requirement],
    )

  return (
    <div className="grid gap-16 lg:grid-cols-[300px_1fr]">
      <section
        aria-label="Your requirements, most important first"
        className="rounded-12 bg-background-lighter p-10 shadow-[0_0_0_1px_rgb(38_38_38/0.07)]"
      >
        <header className="flex items-baseline justify-between px-6 pb-8">
          <p className="text-label-small">What matters most</p>
          <Meta>drag to reorder</Meta>
        </header>

        <Reorder.Group
          axis="y"
          as="ul"
          className="flex flex-col gap-2"
          onReorder={setPriorities}
          values={[...priorities]}
        >
          {priorities.map((requirement, index) => (
            <PriorityRow
              key={requirement}
              index={index}
              isRequired={required.includes(requirement)}
              onToggleRequired={() => toggleRequired(requirement)}
              requirement={requirement}
              total={priorities.length}
            />
          ))}
        </Reorder.Group>

        <p className="px-6 pt-10 text-body-small text-foreground-muted">
          {required.length === 0
            ? 'Mark a requirement as a must-have to rule candidates out.'
            : `${surviving} of ${candidates.length} candidates clear your must-haves.`}
        </p>
      </section>

      <ol className="flex flex-col gap-6">
        {ranked.map((entry, position) => (
          <motion.li
            key={entry.candidate.id}
            layout
            transition={settleTransition}
          >
            <RankedRow
              entry={entry}
              isFocused={entry.candidate.id === focusedId}
              isSaved={savedIds.includes(entry.candidate.id)}
              onFocus={() => onFocus(entry.candidate.id)}
              onToggleSave={() => onToggleSave(entry.candidate.id)}
              position={position}
              priorities={priorities}
            />
          </motion.li>
        ))}
      </ol>
    </div>
  )
}

function PriorityRow({
  index,
  isRequired,
  onToggleRequired,
  requirement,
  total,
}: {
  readonly index: number
  readonly isRequired: boolean
  readonly onToggleRequired: () => void
  readonly requirement: string
  readonly total: number
}) {
  const controls = useDragControls()

  return (
    <Reorder.Item
      as="li"
      className="flex min-h-46 items-center gap-8 rounded-8 bg-black/3 pr-6 pl-4"
      dragControls={controls}
      dragListener={false}
      transition={settleTransition}
      value={requirement}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 10px 26px rgb(38 38 38 / 0.16)',
        zIndex: 10,
      }}
    >
      <button
        aria-label={`Reorder ${requirement}`}
        className="grid size-30 shrink-0 cursor-grab place-items-center rounded-6 text-foreground-muted hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-heat-100 active:cursor-grabbing"
        onPointerDown={(event) => controls.start(event)}
        type="button"
      >
        <GripIcon className="size-14" />
      </button>

      <span className="font-mono text-mono-x-small text-foreground-muted">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-body-medium">
        {requirement}
      </span>

      <span aria-hidden="true" className="flex h-4 w-32 shrink-0 justify-end">
        <span
          className="h-full rounded-full bg-accent-black"
          style={{ width: `${((total - index) / total) * 100}%` }}
        />
      </span>

      <motion.button
        aria-pressed={isRequired}
        className={`min-h-26 shrink-0 rounded-6 px-8 text-label-x-small ${
          isRequired
            ? 'bg-accent-black text-white'
            : 'text-foreground-muted hover:bg-black/5'
        } focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-heat-100`}
        onClick={onToggleRequired}
        transition={snapTransition}
        type="button"
        whileTap={{ scale: 0.95 }}
      >
        must
      </motion.button>
    </Reorder.Item>
  )
}

function RankedRow({
  entry,
  isFocused,
  isSaved,
  onFocus,
  onToggleSave,
  position,
  priorities,
}: {
  readonly entry: RankedCandidate
  readonly isFocused: boolean
  readonly isSaved: boolean
  readonly onFocus: () => void
  readonly onToggleSave: () => void
  readonly position: number
  readonly priorities: readonly string[]
}) {
  const isRuledOut = entry.ruledOutBy !== null

  return (
    <div
      className={`relative flex items-center gap-12 rounded-10 bg-background-lighter px-10 py-8 shadow-[0_0_0_1px_rgb(38_38_38/0.07)] ${
        isRuledOut ? 'opacity-52' : ''
      }`}
    >
      {isFocused ? <FocusRing radius={10} /> : null}

      <motion.span
        className="w-20 shrink-0 text-center font-mono text-mono-small text-foreground-muted tabular-nums"
        layout="position"
      >
        {isRuledOut ? '—' : position + 1}
      </motion.span>

      <button
        aria-label={`Focus ${entry.candidate.name}`}
        className="flex min-w-0 flex-1 items-center gap-12 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
        onClick={onFocus}
        type="button"
      >
        <span className="size-40 shrink-0 overflow-hidden rounded-8 bg-black/8">
          <img
            alt=""
            className="size-full object-cover"
            loading="lazy"
            src={entry.candidate.imageUrl}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-label-small">
            {entry.candidate.name}
          </span>
          <span className="block truncate text-label-x-small text-foreground-muted">
            {isRuledOut
              ? `Ruled out · ${entry.ruledOutBy} is a must-have`
              : entry.candidate.area}
          </span>
        </span>
      </button>

      <PriorityDots candidate={entry.candidate} priorities={priorities} />

      <span className="w-72 shrink-0">
        <span aria-hidden="true" className="block h-4 rounded-full bg-black/6">
          <motion.span
            animate={{ scaleX: entry.score }}
            className={`block h-full origin-left rounded-full ${
              isRuledOut ? 'bg-black/24' : 'bg-heat-100'
            }`}
            initial={{ scaleX: 0 }}
            transition={settleTransition}
          />
        </span>
        <span className="mt-4 block font-mono text-mono-x-small text-foreground-muted tabular-nums">
          {Math.round(entry.score * 100)}% fit
        </span>
      </span>

      <span className="w-72 shrink-0 text-right font-mono text-mono-small tabular-nums">
        {euros(entry.candidate.allIn)}
      </span>

      <motion.button
        aria-label={
          isSaved
            ? `Remove ${entry.candidate.name} from the shortlist`
            : `Add ${entry.candidate.name} to the shortlist`
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
    </div>
  )
}

/** The evidence behind the score, in the order the user just put it in. */
function PriorityDots({
  candidate,
  priorities,
}: {
  readonly candidate: Candidate
  readonly priorities: readonly string[]
}) {
  return (
    <span className="hidden shrink-0 items-center gap-4 md:flex">
      {priorities.map((requirement) => {
        const claim = candidate.claims.find(
          (entry) => entry.requirement === requirement,
        )

        return (
          <motion.span
            key={requirement}
            layout
            title={`${requirement}: ${claim ? claim.status : 'unknown'}`}
            transition={settleTransition}
          >
            <StatusDot
              className="size-8"
              status={claim ? claim.status : 'unknown'}
            />
          </motion.span>
        )
      })}
    </span>
  )
}
