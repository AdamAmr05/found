import { useMemo } from 'react'

import {
  historicalCandidatesInputSchema,
  type ReadPageOutput,
} from '../../../shared/foundTools'
import {
  CandidateResults,
  type CandidateMapBridge,
} from '../accommodation/CandidateResults'
import { attachCandidateMedia } from '../accommodation/candidateMediaCatalog'
import { useMapSceneBridge } from './mapSceneBridge'
import type { FoundUIMessage } from './ThreadMessage'

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
  if (part.state !== 'output-available') return null

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
  const bridge = useMapSceneBridge()
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
    return null
  }

  const mapBridge: CandidateMapBridge | undefined =
    bridge && bridge.mappedRefs.size > 0
      ? {
          mappedRefs: bridge.mappedRefs,
          selectedRef: bridge.selectedRef,
          onOpenMap: bridge.requestDive,
        }
      : undefined

  return (
    <CandidateResults
      candidates={candidates}
      mapBridge={mapBridge}
      streaming={streaming}
      threadId={threadId}
      toolCallId={part.toolCallId}
    />
  )
}
