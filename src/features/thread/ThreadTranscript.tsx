import { ThreadMessage, type FoundUIMessage } from './ThreadMessage'
import { RunActivityIndicator, ThreadActivity } from './ThreadActivity'
import { activityParts, currentActivity, threadTurns } from './activityModel'
import { useTurnOrb } from './useTurnOrb'

export function ThreadTranscript({
  messages,
  active,
  threadId,
}: {
  readonly messages: readonly FoundUIMessage[]
  readonly active: boolean
  readonly threadId: string
}) {
  const turns = threadTurns(messages)
  const latestTurn = turns.at(-1)
  const orb = useTurnOrb(latestTurn?.key ?? 'pending')
  const hasResponse =
    latestTurn?.messages.some(
      (message) =>
        message.role === 'assistant' &&
        message.parts.some(
          (part) => part.type === 'text' && part.text.trim().length > 0,
        ),
    ) ?? false
  const current = currentActivity(
    activityParts(latestTurn?.messages ?? []),
    hasResponse,
  )
  return (
    <div className="flex flex-col gap-24">
      {turns.map((turn) => (
        <div className="flex flex-col gap-24" key={turn.key}>
          {turn.messages.map((message) =>
            message.role === 'user' ? (
              <ThreadMessage
                key={message.key}
                message={message}
                threadId={threadId}
              />
            ) : null,
          )}
          <ThreadActivity
            parts={activityParts(turn.messages)}
            active={active && turn === latestTurn}
          />
          {turn.messages.map((message) =>
            message.role === 'assistant' ? (
              <ThreadMessage
                key={message.key}
                message={message}
                threadId={threadId}
              />
            ) : null,
          )}
        </div>
      ))}
      {active ? <RunActivityIndicator label={current} orb={orb} /> : null}
    </div>
  )
}
