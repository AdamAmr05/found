import type { UIMessage } from '@convex-dev/agent'
import { useSmoothText } from '@convex-dev/agent/react'
import { lazy, Suspense, useMemo } from 'react'

import type { ReadPageOutput } from '../../../shared/foundTools'
import {
  showMapInputSchema,
  type LookupWeatherOutput,
} from '../../../shared/googleMaps'
import { sceneCandidateRefs } from '../accommodation/map3dScene'
import { MapSceneBridgeProvider } from './mapSceneBridge'
import type { FoundThreadTools } from './toolState'

const StreamingMarkdown = lazy(() => import('./ThreadMarkdown'))
const CandidateToolPart = lazy(() => import('./CandidateToolPart'))
const MapToolPart = lazy(() => import('./MapToolPart'))
const OutreachToolPart = lazy(() => import('./OutreachToolPart'))

export type FoundUIMessage = UIMessage<
  Record<string, never>,
  never,
  FoundThreadTools
>

export function ThreadMessage({
  message,
  threadId,
}: {
  message: FoundUIMessage
  threadId: string
}) {
  if (message.role === 'system') return null

  const failed = message.status === 'failed'

  if (message.role === 'user') {
    return <UserMessage message={message} />
  }

  return (
    <AssistantMessage failed={failed} message={message} threadId={threadId} />
  )
}

function UserMessage({ message }: { message: FoundUIMessage }) {
  return (
    <article
      data-message-key={message.key}
      className="ml-auto max-w-560 rounded-12 bg-accent-black px-14 py-10 text-body-large text-white"
    >
      {message.parts.map((part, index) =>
        part.type === 'text' ? (
          <MessageText
            key={`${message.key}-text-${index}`}
            streaming={message.status === 'streaming'}
            text={part.text}
          />
        ) : null,
      )}
    </article>
  )
}

function AssistantMessage({
  failed,
  message,
  threadId,
}: {
  readonly failed: boolean
  readonly message: FoundUIMessage
  readonly threadId: string
}) {
  const readPages = useMemo(
    () =>
      message.parts.flatMap((part): ReadPageOutput[] =>
        part.type === 'tool-readPage' && part.state === 'output-available'
          ? [part.output]
          : [],
      ),
    [message.parts],
  )
  const weather = useMemo(() => {
    let latest: LookupWeatherOutput | undefined
    for (const part of message.parts) {
      if (
        part.type === 'tool-lookupWeather' &&
        part.state === 'output-available'
      ) {
        latest = part.output
      }
    }
    return latest
  }, [message.parts])
  const mappedRefs = useMemo(() => {
    const refs = new Set<string>()
    for (const part of message.parts) {
      if (part.type !== 'tool-showMap' || part.state !== 'output-available') {
        continue
      }
      const parsed = showMapInputSchema.safeParse(part.input)
      if (!parsed.success) continue
      for (const ref of sceneCandidateRefs(parsed.data)) refs.add(ref)
    }
    return refs
  }, [message.parts])

  const visibleParts = message.parts.flatMap((part, index) =>
    (part.type === 'text' && part.text.trim().length > 0) ||
    ((part.type === 'tool-showCandidates' ||
      part.type === 'tool-showMap' ||
      part.type === 'tool-showOutreachDraft') &&
      part.state === 'output-available')
      ? [{ part, index }]
      : [],
  )
  if (visibleParts.length === 0 && !failed) return null

  return (
    <MapSceneBridgeProvider mappedRefs={mappedRefs} weather={weather}>
      <article
        data-message-key={message.key}
        className="flex max-w-720 flex-col gap-14 text-body-large text-accent-black empty:hidden"
      >
        {visibleParts.map(({ part, index }) => (
          <AssistantPart
            key={
              'toolCallId' in part
                ? `${message.key}-tool-${part.toolCallId}`
                : `${message.key}-${part.type}-${index}`
            }
            part={part}
            readPages={readPages}
            streaming={message.status === 'streaming'}
            threadId={threadId}
          />
        ))}
        {failed ? (
          <p className="text-foreground-muted" role="alert">
            I couldn’t finish this response. Please try again.
          </p>
        ) : null}
      </article>
    </MapSceneBridgeProvider>
  )
}

function AssistantPart({
  part,
  readPages,
  streaming,
  threadId,
}: {
  readonly part: FoundUIMessage['parts'][number]
  readonly readPages: readonly ReadPageOutput[]
  readonly streaming: boolean
  readonly threadId: string
}) {
  switch (part.type) {
    case 'text':
      return <MessageText streaming={streaming} text={part.text} />
    case 'tool-showCandidates':
      return (
        <Suspense fallback={null}>
          <CandidateToolPart
            part={part}
            readPages={readPages}
            streaming={streaming}
            threadId={threadId}
          />
        </Suspense>
      )
    case 'tool-showMap':
      return (
        <Suspense fallback={null}>
          <MapToolPart part={part} />
        </Suspense>
      )
    case 'tool-showOutreachDraft':
      return (
        <Suspense fallback={null}>
          <OutreachToolPart part={part} />
        </Suspense>
      )
    default:
      return null
  }
}

function MessageText({
  streaming,
  text,
}: {
  readonly streaming: boolean
  readonly text: string
}) {
  const [smoothText] = useSmoothText(text, { startStreaming: streaming })
  return (
    <Suspense fallback={<p className="whitespace-pre-wrap">{smoothText}</p>}>
      <StreamingMarkdown streaming={streaming} text={smoothText} />
    </Suspense>
  )
}
