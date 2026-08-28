import type { UIMessage } from '@convex-dev/agent'
import { useSmoothText } from '@convex-dev/agent/react'
import { lazy, Suspense } from 'react'

import type { FoundUITools } from '../../../shared/foundTools'
import { isToolActive, ThinkingStep, ToolStep } from './ThreadToolStep'

const StreamingMarkdown = lazy(() =>
  import('streamdown').then(({ Streamdown }) => ({ default: Streamdown })),
)
const CandidateToolPart = lazy(() => import('./CandidateToolPart'))

export type FoundUIMessage = UIMessage<
  Record<string, never>,
  never,
  FoundUITools
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
    <article className="ml-auto max-w-560 rounded-16 bg-accent-black px-16 py-12 text-body-large text-white">
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
  return (
    <article className="flex max-w-720 flex-col gap-16 text-body-large text-accent-black">
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
            streaming={message.status === 'streaming'}
            threadId={threadId}
          />
        ))
      )}
    </article>
  )
}

function AssistantPart({
  part,
  streaming,
  threadId,
}: {
  readonly part: FoundUIMessage['parts'][number]
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
    case 'tool-showCandidates':
      return (
        <Suspense
          fallback={<ToolStep active label="Preparing the useful options" />}
        >
          <CandidateToolPart part={part} threadId={threadId} />
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
  readonly state: string
}) {
  const active = isToolActive(state)
  const error = state === 'output-error'
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
      <StreamingMarkdown
        className="[&_a]:text-heat-100 [&_a]:underline [&_a]:underline-offset-3 [&_h1]:mt-18 [&_h1]:text-title-h4 [&_h2]:mt-16 [&_h2]:text-title-h5 [&_h3]:mt-14 [&_h3]:text-label-large [&_li]:my-4 [&_ol]:my-10 [&_ol]:pl-20 [&_p+p]:mt-10 [&_ul]:my-10 [&_ul]:pl-20"
        controls={false}
        isAnimating={streaming}
        mode={streaming ? 'streaming' : 'static'}
      >
        {smoothText}
      </StreamingMarkdown>
    </Suspense>
  )
}

export { ThinkingStep } from './ThreadToolStep'
