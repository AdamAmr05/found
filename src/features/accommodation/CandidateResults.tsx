import {
  useSessionMutation,
  useSessionQuery,
} from 'convex-helpers/react/sessions'
import { LayoutGroup } from 'motion/react'
import { useState } from 'react'

import { api } from '../../../convex/_generated/api'
import { CandidateCard } from './CandidateCard'
import { CandidateFold } from './CandidateFold'
import type { RenderableCandidate } from './candidateMediaCatalog'

export type CandidateMapBridge = {
  readonly mappedRefs: ReadonlySet<string>
  readonly selectedRef: string | undefined
  readonly onOpenMap: (candidateRef: string) => void
}

interface CandidateResultsProps {
  readonly candidates: readonly RenderableCandidate[]
  readonly mapBridge?: CandidateMapBridge | undefined
  readonly streaming: boolean
  readonly threadId: string
  readonly toolCallId: string
}

export function CandidateResults({
  candidates,
  mapBridge,
  streaming,
  threadId,
  toolCallId,
}: CandidateResultsProps) {
  const [saveErrorRef, setSaveErrorRef] = useState<string>()
  const savedCandidateState = useSessionQuery(
    api.savedCandidates.listForToolPart,
    {
      threadId,
      toolCallId,
    },
  )
  const setSaved = useSessionMutation(
    api.savedCandidates.setSaved,
  ).withOptimisticUpdate((store, args) => {
    const queryArgs = {
      sessionId: args.sessionId,
      threadId: args.threadId,
      toolCallId: args.toolCallId,
    }
    const current = store.getQuery(
      api.savedCandidates.listForToolPart,
      queryArgs,
    )
    if (!current) return

    store.setQuery(api.savedCandidates.listForToolPart, queryArgs, {
      ...current,
      savedRefs: args.saved
        ? [...new Set([...current.savedRefs, args.candidateRef])]
        : current.savedRefs.filter((ref) => ref !== args.candidateRef),
    })
  })
  const savedRefs = new Set(savedCandidateState?.savedRefs ?? [])
  const saveDisabled = streaming || savedCandidateState?.ready !== true

  function toggleSave(candidateRef: string): void {
    if (saveDisabled) return
    setSaveErrorRef((current) =>
      current === candidateRef ? undefined : current,
    )
    void setSaved({
      candidateRef,
      saved: !savedRefs.has(candidateRef),
      threadId,
      toolCallId,
    }).catch((error) => {
      globalThis.reportError(error)
      setSaveErrorRef(candidateRef)
    })
  }

  if (candidates.length >= 3) {
    return (
      <LayoutGroup id={toolCallId}>
        <CandidateFold
          candidates={candidates}
          layoutScope={toolCallId}
          mapBridge={mapBridge}
          saveErrorRef={saveErrorRef}
          saveDisabled={saveDisabled}
          savedRefs={savedRefs}
          onToggleSave={toggleSave}
        />
      </LayoutGroup>
    )
  }

  return (
    <LayoutGroup id={toolCallId}>
      <div className="grid gap-16">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.ref}
            candidate={candidate}
            layoutScope={toolCallId}
            mapHighlighted={mapBridge?.selectedRef === candidate.ref}
            saveError={saveErrorRef === candidate.ref}
            saveDisabled={saveDisabled}
            saved={savedRefs.has(candidate.ref)}
            onOpenMap={
              mapBridge?.mappedRefs.has(candidate.ref)
                ? () => mapBridge.onOpenMap(candidate.ref)
                : undefined
            }
            onToggleSave={() => toggleSave(candidate.ref)}
          />
        ))}
      </div>
    </LayoutGroup>
  )
}
