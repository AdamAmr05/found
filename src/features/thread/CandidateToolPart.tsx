import { historicalCandidatesInputSchema } from '../../../shared/foundTools'
import { CandidateResults } from '../accommodation/CandidateResults'
import type { FoundUIMessage } from './ThreadMessage'
import { isToolActive, ToolStep } from './ThreadToolStep'

export default function CandidateToolPart({
  part,
  threadId,
}: {
  readonly part: Extract<
    FoundUIMessage['parts'][number],
    { type: 'tool-showCandidates' }
  >
  readonly threadId: string
}) {
  if (part.state !== 'output-available') {
    return (
      <ToolStep
        active={isToolActive(part.state)}
        error={part.state === 'output-error'}
        label={
          part.state === 'output-error'
            ? 'Couldn’t prepare the options'
            : 'Preparing the useful options'
        }
      />
    )
  }

  const parsed = historicalCandidatesInputSchema.safeParse(part.output)
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
import { domAnimation, LazyMotion } from 'motion/react'
