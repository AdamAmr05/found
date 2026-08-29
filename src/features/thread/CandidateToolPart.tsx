import { useMemo } from 'react'

import {
  historicalCandidatesInputSchema,
  type ReadPageOutput,
} from '../../../shared/foundTools'
import { CandidateResults } from '../accommodation/CandidateResults'
import { attachCandidateMedia } from '../accommodation/candidateMediaCatalog'
import type { FoundUIMessage } from './ThreadMessage'
import { ToolStep } from './ThreadToolStep'
import { isToolActive } from './toolState'

type CandidatePart = Extract<
  FoundUIMessage['parts'][number],
  { type: 'tool-showCandidates' }
>

type CompletedCandidatePart = Extract<
  CandidatePart,
  { state: 'output-available' }
>

export default function CandidateToolPart({
  part,
  readPages,
  streaming,
  threadId,
}: {
  readonly part: CandidatePart
  readonly readPages: readonly ReadPageOutput[]
  readonly streaming: boolean
  readonly threadId: string
}) {
  if (part.state !== 'output-available') {
    const failed =
      part.state === 'output-error' || part.state === 'output-denied'
    return (
      <ToolStep
        active={isToolActive(part.state)}
        error={failed}
        label={
          failed
            ? 'Couldn’t prepare the options'
            : 'Preparing the useful options'
        }
      />
    )
  }

  return (
    <CompletedCandidateToolPart
      part={part}
      readPages={readPages}
      streaming={streaming}
      threadId={threadId}
    />
  )
}

function CompletedCandidateToolPart({
  part,
  readPages,
  streaming,
  threadId,
}: {
  readonly part: CompletedCandidatePart
  readonly readPages: readonly ReadPageOutput[]
  readonly streaming: boolean
  readonly threadId: string
}) {
  const parsed = useMemo(
    () => historicalCandidatesInputSchema.safeParse(part.input),
    [part.input],
  )
  const candidates = useMemo(
    () =>
      parsed.success
        ? attachCandidateMedia(parsed.data.candidates, readPages)
        : [],
    [parsed, readPages],
  )
  if (!parsed.success) {
    return <ToolStep error label="Candidate output could not be displayed" />
  }

  return (
    <CandidateResults
      candidates={candidates}
      streaming={streaming}
      threadId={threadId}
      toolCallId={part.toolCallId}
    />
  )
}
