import { ThreadMessage, ThinkingStep } from './ThreadMessage'
import { ThreadConversation } from './ThreadConversation'
import { FoundHeader } from '../navigation/FoundHeader'
import { ThreadShortlist } from '../saved-candidates/ThreadShortlist'
import { useThreadSession } from './useThreadSession'
import { ThreadWelcome } from './ThreadWelcome'
import { ThreadComposer } from './ThreadComposer'
import './thread-entry.css'

export function FoundThread() {
  const {
    draft,
    interactionBlocked,
    messages,
    openingThread,
    runActive,
    setDraft,
    startNewThread,
    submit,
    submitError,
    submitting,
    threadId,
  } = useThreadSession()
  const idleScreen = !openingThread && (!threadId || messages.length === 0)

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-background-base">
      <FoundHeader {...(threadId ? { onNewThread: startNewThread } : {})} />
      <section
        className={`mx-auto flex min-h-0 w-full max-w-920 flex-1 flex-col px-20 sm:px-32 ${idleScreen ? 'overflow-y-auto' : 'overflow-hidden'}`}
      >
        <div
          className={
            idleScreen
              ? 'mx-auto my-auto w-full max-w-720 py-24 sm:py-48'
              : 'flex min-h-0 flex-1 flex-col'
          }
        >
          {openingThread ? (
            <div className="grid flex-1 place-items-center">
              <ThinkingStep label="Opening thread" />
            </div>
          ) : !threadId || messages.length === 0 ? (
            <ThreadWelcome
              disabled={interactionBlocked}
              onSelect={(prompt) => void submit(prompt)}
            />
          ) : (
            <ThreadConversation>
              <div className="flex flex-col gap-24">
                {messages.map((message) => (
                  <ThreadMessage
                    key={message.key}
                    message={message}
                    threadId={threadId}
                  />
                ))}
                {submitting && !runActive ? <ThinkingStep /> : null}
              </div>
            </ThreadConversation>
          )}
          <div
            className={
              idleScreen
                ? 'mt-24'
                : 'mt-auto shrink-0 bg-gradient-to-t from-background-base via-background-base to-transparent pt-16 pb-16 sm:pt-20 sm:pb-22'
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
      </section>
    </main>
  )
}
