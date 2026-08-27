import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useState } from 'react'
import type { Candidate, CandidateId } from '../candidates'
import { getCandidate } from '../candidates'
import { revealTransition, settleTransition } from '../motion'
import { Meta } from '../primitives'
import { LooseEnds } from './LooseEnds'
import { ScrubbableAmount } from './ScrubbableAmount'
import type { ArtifactResolution } from './ThreadArtifact'
import { ThreadArtifact } from './ThreadArtifact'
import type { ProseSegment, ThreadEntry } from './script'
import { threadScript } from './script'

export interface ThreadSceneProps {
  readonly candidates: readonly Candidate[]
  readonly ceiling: number
  readonly onCeilingChange: Dispatch<SetStateAction<number>>
  readonly savedIds: readonly CandidateId[]
  readonly onToggleSave: (id: CandidateId) => void
}

/**
 * The thread holds references, not copies. Resolution lives beside the artifact
 * set rather than inside a message, so a place that is mentioned twice is one
 * object mentioned twice: open it in the newest message and the oldest message
 * is showing the same thing, because it always was.
 */
export function ThreadScene({
  candidates,
  ceiling,
  onCeilingChange,
  savedIds,
  onToggleSave,
}: ThreadSceneProps) {
  const [resolutions, setResolutions] = useState<
    Readonly<Partial<Record<CandidateId, ArtifactResolution>>>
  >({})
  const [linkedId, setLinkedId] = useState<CandidateId | null>(null)

  const setResolution = (id: CandidateId, next: ArtifactResolution) =>
    setResolutions((current) => ({ ...current, [id]: next }))

  return (
    <div className="flex flex-col gap-20">
      {threadScript.map((entry) => (
        <ThreadRow
          key={entry.id}
          candidates={candidates}
          ceiling={ceiling}
          entry={entry}
          linkedId={linkedId}
          onCeilingChange={onCeilingChange}
          onLink={setLinkedId}
          onResolutionChange={setResolution}
          onToggleSave={onToggleSave}
          resolutions={resolutions}
          savedIds={savedIds}
        />
      ))}
    </div>
  )
}

interface ThreadRowProps extends ThreadSceneProps {
  readonly entry: ThreadEntry
  readonly linkedId: CandidateId | null
  readonly onLink: (id: CandidateId | null) => void
  readonly onResolutionChange: (
    id: CandidateId,
    next: ArtifactResolution,
  ) => void
  readonly resolutions: Readonly<
    Partial<Record<CandidateId, ArtifactResolution>>
  >
}

function ThreadRow(props: ThreadRowProps) {
  const { entry } = props

  switch (entry.kind) {
    case 'user':
      return <UserTurn text={entry.text} />
    case 'assistant':
      return (
        <AssistantTurn
          candidates={props.candidates}
          ceiling={props.ceiling}
          onCeilingChange={props.onCeilingChange}
          prose={entry.prose}
        />
      )
    case 'outreach':
      return (
        <Indented>
          <LooseEnds candidates={props.candidates} />
        </Indented>
      )
    case 'artifacts':
      return (
        <Indented>
          <div className="flex flex-col gap-8">
            {entry.candidateIds.map((id) => (
              <ThreadArtifact
                key={id}
                candidate={getCandidate(id)}
                isLinked={props.linkedId === id}
                isSaved={props.savedIds.includes(id)}
                occurrenceId={`${entry.id}-${id}`}
                onHoverChange={(isHovering) =>
                  props.onLink(isHovering ? id : null)
                }
                onResolutionChange={(next) =>
                  props.onResolutionChange(id, next)
                }
                onToggleSave={() => props.onToggleSave(id)}
                resolution={props.resolutions[id] ?? 'glance'}
              />
            ))}
          </div>
        </Indented>
      )
  }
}

function Indented({ children }: { readonly children: ReactNode }) {
  return <div className="pl-0 sm:pl-44">{children}</div>
}

function UserTurn({ text }: { readonly text: string }) {
  return (
    <div className="flex justify-end gap-12">
      <motion.p
        animate={{ opacity: 1, y: 0 }}
        className="max-w-560 rounded-12 rounded-br-4 bg-accent-black px-14 py-10 text-body-medium text-white"
        initial={{ opacity: 0, y: 6 }}
        transition={revealTransition}
      >
        {text}
      </motion.p>
    </div>
  )
}

function AssistantTurn({
  candidates,
  ceiling,
  onCeilingChange,
  prose,
}: {
  readonly candidates: readonly Candidate[]
  readonly ceiling: number
  readonly onCeilingChange: Dispatch<SetStateAction<number>>
  readonly prose: readonly ProseSegment[]
}) {
  const within = candidates.filter((entry) => entry.allIn <= ceiling).length
  const open = candidates
    .flatMap((entry) => entry.claims)
    .filter((claim) => claim.status !== 'confirmed').length

  return (
    <div className="flex gap-12">
      <span
        aria-hidden="true"
        className="grid size-32 shrink-0 place-items-center rounded-8 bg-accent-black font-mono text-mono-x-small text-white"
      >
        AI
      </span>
      <p className="max-w-680 pt-4 text-body-large text-pretty">
        {prose.map((segment, index) => (
          <ProsePart
            key={`${segment.kind}-${index}`}
            ceiling={ceiling}
            onCeilingChange={onCeilingChange}
            openCount={open}
            overCount={candidates.length - within}
            segment={segment}
            withinCount={within}
          />
        ))}
      </p>
    </div>
  )
}

/** A number inside a sentence is still a number the reader may want to change. */
function ProsePart({
  ceiling,
  onCeilingChange,
  openCount,
  overCount,
  segment,
  withinCount,
}: {
  readonly ceiling: number
  readonly onCeilingChange: Dispatch<SetStateAction<number>>
  readonly openCount: number
  readonly overCount: number
  readonly segment: ProseSegment
  readonly withinCount: number
}) {
  switch (segment.kind) {
    case 'text':
      return <span>{segment.text}</span>
    case 'ceiling':
      return (
        <ScrubbableAmount
          bounds={{ low: 900, high: 1700 }}
          label="Your monthly ceiling"
          onChange={onCeilingChange}
          value={ceiling}
        />
      )
    case 'withinCount':
      return <LiveCount value={withinCount} />
    case 'overCount':
      return <LiveCount value={overCount} />
    case 'openCount':
      return <LiveCount value={openCount} />
  }
}

/** The sentence is derived from the requirement, so it changes when it does. */
function LiveCount({ value }: { readonly value: number }) {
  return (
    <motion.span
      key={value}
      animate={{ opacity: 1, y: 0 }}
      className="inline-block font-mono text-mono-medium tabular-nums"
      initial={{ opacity: 0, y: 4 }}
      transition={settleTransition}
    >
      {value}
    </motion.span>
  )
}

export function ThreadCaption() {
  return (
    <p className="flex flex-wrap items-baseline gap-8 text-body-small text-foreground-muted">
      <span>Canal-side Altbau appears twice.</span>
      <Meta>Hover either result to find the other.</Meta>
    </p>
  )
}
