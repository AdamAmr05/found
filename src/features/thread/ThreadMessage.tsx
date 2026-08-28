import type { UIMessage } from '@convex-dev/agent'
import { useSmoothText } from '@convex-dev/agent/react'
import { lazy, Suspense } from 'react'

import type { FoundUITools } from '../../../shared/foundTools'
import { showCandidatesInputSchema } from '../../../shared/foundTools'
import { CandidateResults } from '../accommodation/CandidateResults'

const StreamingMarkdown = lazy(() =>
  import('streamdown').then(({ Streamdown }) => ({ default: Streamdown })),
)

export type FoundUIMessage = UIMessage<
  Record<string, never>,
  never,
  FoundUITools
>

export function ThreadMessage({ message }: { message: FoundUIMessage }) {
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

  return <AssistantMessage failed={failed} message={message} />
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
}: {
  readonly failed: boolean
  readonly message: FoundUIMessage
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
          />
        ))
      )}
    </article>
  )
}

function AssistantPart({
  part,
  streaming,
}: {
  readonly part: FoundUIMessage['parts'][number]
  readonly streaming: boolean
}) {
  switch (part.type) {
    case 'text':
      return <MessageText streaming={streaming} text={part.text} />
    case 'tool-searchWeb':
      return <ResearchToolStep kind="search" state={part.state} />
    case 'tool-readPage':
      return <ResearchToolStep kind="read" state={part.state} />
    case 'tool-showCandidates':
      return <CandidateToolPart part={part} />
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

function CandidateToolPart({
  part,
}: {
  readonly part: Extract<
    FoundUIMessage['parts'][number],
    { type: 'tool-showCandidates' }
  >
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

  const parsed = showCandidatesInputSchema.safeParse(part.output)
  if (!parsed.success) {
    return <ToolStep error label="Candidate output could not be displayed" />
  }
  return <CandidateResults candidates={parsed.data.candidates} />
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

function isToolActive(state: string): boolean {
  return (
    state === 'input-streaming' ||
    state === 'input-available' ||
    state === 'approval-requested' ||
    state === 'approval-responded'
  )
}

export function ThinkingStep({ label = 'Thinking' }: { label?: string }) {
  return <ToolStep active label={label} />
}

function ToolStep({
  active = false,
  error = false,
  label,
}: {
  readonly active?: boolean
  readonly error?: boolean
  readonly label: string
}) {
  return (
    <div
      className={`flex items-center gap-10 text-body-medium ${
        error ? 'text-accent-crimson' : 'text-foreground-muted'
      }`}
      aria-live={active ? 'polite' : undefined}
    >
      <span className="relative grid size-18 place-items-center" aria-hidden>
        {active ? (
          <span className="absolute size-18 animate-ping rounded-full bg-heat-12" />
        ) : null}
        <span
          className={`size-7 rounded-full ${
            error
              ? 'bg-accent-crimson'
              : active
                ? 'bg-heat-100'
                : 'bg-accent-forest'
          }`}
        />
      </span>
      {label}
    </div>
  )
}
