import { ThreadTranscript } from './ThreadTranscript'
import { ThreadConversation } from './ThreadConversation'
import { ThreadShortlist } from '../saved-candidates/ThreadShortlist'
import { useThreadSessionContext } from './ThreadSessionContext'
import { ThreadWelcome } from './ThreadWelcome'
import { ThreadComposer } from './ThreadComposer'

export function FoundThread() {
  const {
    draft,
    interactionBlocked,
    messages,
    openingThread,
    runActive,
    setDraft,
    submit,
    submitError,
    submitting,
    threadId,
  } = useThreadSessionContext()
  const idleScreen = !openingThread && (!threadId || messages.length === 0)

  return (
    <main
      className={`flex min-h-0 min-w-0 flex-1 flex-col ${idleScreen ? 'overflow-y-auto' : 'overflow-hidden'}`}
    >
      <div
        className={
          idleScreen
            ? 'mx-auto my-auto w-full max-w-784 px-20 py-24 sm:px-32 sm:py-48'
            : 'flex min-h-0 flex-1 flex-col'
        }
      >
        {openingThread ? (
          <div className="grid flex-1 place-items-center">
            <output className="text-body-medium text-foreground-muted">
              Opening thread…
            </output>
          </div>
        ) : !threadId || messages.length === 0 ? (
          <ThreadWelcome
            disabled={interactionBlocked}
            onSelect={(prompt) => void submit(prompt)}
          />
        ) : (
          <ThreadConversation key={threadId}>
            <ThreadTranscript
              messages={messages}
              active={runActive || submitting}
              threadId={threadId}
            />
          </ThreadConversation>
        )}
        <div
          className={
            idleScreen
              ? 'mt-24'
              : 'mt-auto shrink-0 bg-gradient-to-t from-background-base via-background-base to-transparent px-20 pt-16 pb-16 sm:px-32 sm:pt-20 sm:pb-22'
          }
        >
          <div className="mx-auto max-w-720">
            {threadId ? <ThreadShortlist threadId={threadId} /> : null}
            {submitError ? (
              <p
                className="mb-10 text-body-small text-accent-crimson"
                role="alert"
              >
                {submitError}
              </p>
            ) : null}
            <ThreadComposer
              key={threadId ?? 'new-thread'}
              showIdleBeam={idleScreen}
              disabled={interactionBlocked}
              value={draft}
              onChange={setDraft}
              onSubmit={() => void submit()}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
