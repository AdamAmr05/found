import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { ThreadConversation } from '../../src/features/thread/ThreadConversation'
import { ThreadTranscript } from '../../src/features/thread/ThreadTranscript'
import { message } from './activity-messages'
import '../../src/styles/app.css'

const history = Array.from({ length: 120 }, (_, index) =>
  message(`message-${index}`, 'user', [
    {
      type: 'text',
      text: `Saved message ${index}. Keep this conversation available across every page of history.`,
    },
  ]),
)

function HistoryFixture() {
  const [count, setCount] = useState(40)
  const [loading, setLoading] = useState(false)
  const [thread, setThread] = useState('first')
  const staged = new URLSearchParams(window.location.search).has('staged')
  function loadOlderMessages(): void {
    if (loading || count === history.length) return
    if (new URLSearchParams(window.location.search).has('cached')) {
      setCount((previous) => Math.min(previous + 40, history.length))
      return
    }
    setLoading(true)
    if (staged) return
    // Simulate only the external page request; use the real transcript and viewport.
    window.setTimeout(() => {
      setCount((previous) => Math.min(previous + 40, history.length))
      setLoading(false)
    }, 300)
  }
  return (
    <main className="flex h-dvh flex-col">
      {staged ? (
        <nav>
          <button
            type="button"
            onClick={() =>
              setCount((previous) => Math.min(previous + 40, history.length))
            }
          >
            Deliver older page
          </button>
          <button type="button" onClick={() => setLoading(false)}>
            Finish loading
          </button>
        </nav>
      ) : null}
      <button
        type="button"
        onClick={() => {
          setThread('second')
          setCount(40)
        }}
      >
        Switch thread
      </button>
      <ThreadConversation
        key={thread}
        canLoadOlderMessages={count < history.length}
        loadingOlderMessages={loading}
        onLoadOlderMessages={loadOlderMessages}
      >
        <ThreadTranscript
          messages={history.slice(-count)}
          active={false}
          threadId={thread}
        />
      </ThreadConversation>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing fixture root')
createRoot(root).render(
  <StrictMode>
    <HistoryFixture />
  </StrictMode>,
)
