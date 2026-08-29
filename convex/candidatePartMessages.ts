import type { MessageDoc } from '@convex-dev/agent'

import {
  historicalCandidatesInputSchema,
  readPageOutputSchema,
  type CandidateSnapshot,
  type ReadPageOutput,
} from '../shared/foundTools'
import { candidateSourceImages } from '../shared/candidateImages'

const CANDIDATE_TOOL_NAME = 'showCandidates'

interface CandidateToolCall {
  readonly candidateRefs: string[]
  readonly messageId: string
  readonly previewImages: {
    readonly candidateRef: string
    readonly url: string
  }[]
  readonly toolCallId: string
}

function readPageCallIds(messages: readonly MessageDoc[]): Set<string> {
  const callIds = new Set<string>()
  for (const message of messages) {
    const content = message.message?.content
    if (message.message?.role !== 'assistant' || !Array.isArray(content)) {
      continue
    }
    for (const part of content) {
      if (part.type === 'tool-call' && part.toolName === 'readPage') {
        callIds.add(part.toolCallId)
      }
    }
  }
  return callIds
}

function readPageOutputs(messages: readonly MessageDoc[]): ReadPageOutput[] {
  const callIds = readPageCallIds(messages)
  const pages: ReadPageOutput[] = []
  for (const message of messages) {
    const content = message.message?.content
    if (message.message?.role !== 'tool' || !Array.isArray(content)) continue
    for (const part of content) {
      if (part.type !== 'tool-result' || !callIds.has(part.toolCallId)) continue
      const parsed = readPageOutputSchema.safeParse(part.result)
      if (parsed.success) pages.push(parsed.data)
    }
  }
  return pages
}

function previewImages(
  candidates: readonly CandidateSnapshot[],
  pages: readonly ReadPageOutput[],
): CandidateToolCall['previewImages'] {
  return candidates.flatMap((candidate) => {
    const preview = candidateSourceImages(candidate, pages, 1)[0]
    return preview ? [{ candidateRef: candidate.ref, url: preview.url }] : []
  })
}

function candidateToolInput(
  message: MessageDoc,
  toolCallId?: string,
):
  | {
      readonly candidates: readonly CandidateSnapshot[]
      readonly toolCallId: string
    }
  | undefined {
  const modelMessage = message.message
  if (
    modelMessage?.role !== 'assistant' ||
    !Array.isArray(modelMessage.content)
  ) {
    return undefined
  }

  for (const part of modelMessage.content) {
    if (
      part.type !== 'tool-call' ||
      part.toolName !== CANDIDATE_TOOL_NAME ||
      (toolCallId && part.toolCallId !== toolCallId)
    ) {
      continue
    }

    const parsed = historicalCandidatesInputSchema.safeParse(part.input)
    if (parsed.success) {
      return { candidates: parsed.data.candidates, toolCallId: part.toolCallId }
    }
  }

  return undefined
}

export function candidateToolCalls(
  messages: readonly MessageDoc[],
): CandidateToolCall[] {
  const pages = readPageOutputs(messages)
  return messages.flatMap((message) => {
    const toolInput = candidateToolInput(message)
    return toolInput
      ? [
          {
            candidateRefs: toolInput.candidates.map(
              (candidate) => candidate.ref,
            ),
            messageId: message._id,
            previewImages: previewImages(toolInput.candidates, pages),
            toolCallId: toolInput.toolCallId,
          },
        ]
      : []
  })
}

export function candidateFromToolMessage(
  message: MessageDoc,
  toolCallId: string,
  candidateRef: string,
): CandidateSnapshot | undefined {
  return candidateToolInput(message, toolCallId)?.candidates.find(
    (candidate) => candidate.ref === candidateRef,
  )
}
