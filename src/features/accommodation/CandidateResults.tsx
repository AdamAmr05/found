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

interface CandidateResultsProps {
  readonly candidates: readonly RenderableCandidate[]
  readonly threadId: string
  readonly toolCallId: string
}

export function CandidateResults({
  candidates,
  threadId,
  toolCallId,
}: CandidateResultsProps) {
  const [saveErrorRef, setSaveErrorRef] = useState<string>()
  const savedCandidateRefs = useSessionQuery(api.shortlist.listForToolPart, {
    threadId,
    toolCallId,
  })
  const setSaved = useSessionMutation(
    api.shortlist.setSaved,
  ).withOptimisticUpdate((store, args) => {
    const queryArgs = {
      sessionId: args.sessionId,
      threadId: args.threadId,
      toolCallId: args.toolCallId,
    }
    const current = store.getQuery(api.shortlist.listForToolPart, queryArgs)
    if (!current) return

    store.setQuery(
      api.shortlist.listForToolPart,
      queryArgs,
      args.saved
        ? [...new Set([...current, args.candidateRef])]
        : current.filter((ref) => ref !== args.candidateRef),
    )
  })
  const savedRefs = new Set(savedCandidateRefs ?? [])

  function toggleSave(candidateRef: string): void {
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
          saveErrorRef={saveErrorRef}
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
            saveError={saveErrorRef === candidate.ref}
            saved={savedRefs.has(candidate.ref)}
            onToggleSave={() => toggleSave(candidate.ref)}
          />
        ))}
      </div>
    </LayoutGroup>
  )
}
