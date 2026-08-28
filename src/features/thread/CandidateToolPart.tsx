import { domAnimation, LazyMotion } from 'motion/react'
import { useMemo } from 'react'

import { historicalCandidatesInputSchema } from '../../../shared/foundTools'
import { CandidateResults } from '../accommodation/CandidateResults'
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
  threadId,
}: {
  readonly part: CandidatePart
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

  return <CompletedCandidateToolPart part={part} threadId={threadId} />
}

function CompletedCandidateToolPart({
  part,
  threadId,
}: {
  readonly part: CompletedCandidatePart
  readonly threadId: string
}) {
  const parsed = useMemo(
    () => historicalCandidatesInputSchema.safeParse(part.input),
    [part.input],
  )
  if (!parsed.success) {
    return <ToolStep error label="Candidate output could not be displayed" />
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <CandidateResults
        candidates={parsed.data.candidates}
        threadId={threadId}
        toolCallId={part.toolCallId}
      />
    </LazyMotion>
  )
}
