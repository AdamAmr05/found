import {
  useSessionMutation,
  useSessionQuery,
} from 'convex-helpers/react/sessions'

import { api } from '../../../convex/_generated/api'
import type { CandidateSnapshot } from '../../../shared/foundTools'
import { CandidateCard } from './CandidateCard'
import { CandidateFold } from './CandidateFold'

interface CandidateResultsProps {
  readonly candidates: readonly CandidateSnapshot[]
  readonly threadId: string
  readonly toolCallId: string
}

export function CandidateResults({
  candidates,
  threadId,
  toolCallId,
}: CandidateResultsProps) {
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
    void setSaved({
      candidateRef,
      saved: !savedRefs.has(candidateRef),
      threadId,
      toolCallId,
    }).catch(() => undefined)
  }

  if (candidates.length >= 3) {
    return (
      <CandidateFold
        candidates={candidates}
        savedRefs={savedRefs}
        onToggleSave={toggleSave}
      />
    )
  }

  return (
    <div className="grid gap-16">
      {candidates.map((candidate) => (
        <CandidateCard
          key={candidate.ref}
          candidate={candidate}
          saved={savedRefs.has(candidate.ref)}
          onToggleSave={() => toggleSave(candidate.ref)}
        />
      ))}
    </div>
  )
}
