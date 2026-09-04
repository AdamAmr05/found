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
import { MapsGroundingPart } from './MapsGroundingPart'
import { ThinkingStep, ToolStep } from './ThreadToolStep'
import {
  type FoundThreadTools,
  type FoundToolState,
  isToolActive,
} from './toolState'

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
  const hasVisiblePart = message.parts.some(
    (part) => part.type === 'text' || part.type.startsWith('tool-'),
  )

  if (message.role === 'assistant' && !hasVisiblePart && !failed) {
    return <ThinkingStep />
  }

  if (message.role === 'user') {
    return <UserMessage message={message} />
  }

  return (
    <AssistantMessage failed={failed} message={message} threadId={threadId} />
  )
}

function UserMessage({ message }: { message: FoundUIMessage }) {
  return (
    <article className="ml-auto max-w-560 rounded-12 bg-accent-black px-14 py-10 text-body-large text-white">
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

  return (
    <MapSceneBridgeProvider mappedRefs={mappedRefs} weather={weather}>
      <article className="flex max-w-720 flex-col gap-14 text-body-large text-accent-black">
        {failed ? (
          <p className="text-accent-crimson">
            I couldn’t finish that response. Check the service configuration and
            try again.
          </p>
        ) : (
          message.parts.map((part, index) => (
            <AssistantPart
              key={`${message.key}-${part.type}-${index}`}
              part={part}
              readPages={readPages}
              streaming={message.status === 'streaming'}
              threadId={threadId}
            />
          ))
        )}
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
    case 'tool-searchWeb':
      return <ResearchToolStep kind="search" state={part.state} />
    case 'tool-readPage':
      return <ResearchToolStep kind="read" state={part.state} />
    case 'tool-listOutreachUpdates':
      return (
        <ToolStep
          active={isToolActive(part.state)}
          label={
            isToolActive(part.state)
              ? 'Checking email updates'
              : 'Checked email updates'
          }
        />
      )
    case 'tool-readOutreachThread':
      return (
        <ToolStep
          active={isToolActive(part.state)}
          label={
            isToolActive(part.state)
              ? 'Reading the email thread'
              : 'Read the email thread'
          }
        />
      )
    case 'tool-showCandidates':
      return (
        <Suspense
          fallback={<ToolStep active label="Preparing the useful options" />}
        >
          <CandidateToolPart
            part={part}
            readPages={readPages}
            streaming={streaming}
            threadId={threadId}
          />
        </Suspense>
      )
    case 'tool-searchPlaces':
    case 'tool-computeRoutes':
    case 'tool-lookupWeather':
    case 'tool-resolvePlaces':
      return <MapsGroundingPart part={part} />
    case 'tool-showMap':
      return (
        <Suspense
          fallback={<ToolStep active label="Composing the map scene" />}
        >
          <MapToolPart part={part} />
        </Suspense>
      )
    case 'tool-showOutreachDraft':
      return (
        <Suspense fallback={<ToolStep active label="Writing the email" />}>
          <OutreachToolPart part={part} />
        </Suspense>
      )
    default:
      return null
  }
}

function ResearchToolStep({
  kind,
  state,
}: {
  readonly kind: 'read' | 'search'
  readonly state: FoundToolState
}) {
  const active = isToolActive(state)
  const error = state === 'output-error' || state === 'output-denied'
  const labels =
    kind === 'search'
      ? {
          active: 'Searching the live web',
          error: 'Web search failed',
          success: 'Searched the live web',
        }
      : {
          active: 'Reading a relevant source',
          error: 'Couldn’t read a source',
          success: 'Read a relevant source',
        }
  const label = active ? labels.active : error ? labels.error : labels.success

  return <ToolStep active={active} error={error} label={label} />
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

export { ThinkingStep } from './ThreadToolStep'
