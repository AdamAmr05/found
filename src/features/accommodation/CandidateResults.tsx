import { useState } from 'react'

import type { CandidateSnapshot } from '../../../shared/foundTools'
import { CandidateCard } from './CandidateCard'
import { CandidateFold } from './CandidateFold'

interface CandidateResultsProps {
  readonly candidates: readonly CandidateSnapshot[]
}

export function CandidateResults({ candidates }: CandidateResultsProps) {
  const [savedRefs, setSavedRefs] = useState<ReadonlySet<string>>(new Set())

  const toggleSave = (candidateRef: string) => {
    setSavedRefs((current) => {
      const next = new Set(current)
      if (next.has(candidateRef)) next.delete(candidateRef)
      else next.add(candidateRef)
      return next
    })
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
