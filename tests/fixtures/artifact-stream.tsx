import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

import {
  ThreadMessage,
  type FoundUIMessage,
} from '../../src/features/thread/ThreadMessage'
import type { CandidateSnapshot } from '../../shared/foundTools'
import { message } from './activity-messages'
import '../../src/styles/app.css'

// Playwright intercepts this connection. Saves remain pending while the actual
// message renderer, candidate cards, tabs, and markdown dialog run unchanged.
const client = new ConvexReactClient('https://artifact-fixture.convex.cloud')

function candidate(title: string): CandidateSnapshot {
  return {
    ref: 'room',
    title,
    location: { label: 'Ulm' },
    sources: [
      { ref: 'listing', url: 'https://example.com/room', label: 'Listing' },
    ],
    atAGlance: { summary: `${title} overview`, facts: [] },
    evidence: [
      {
        claim: 'Furnished',
        finding: `${title} includes furniture`,
        status: 'claimed',
        sourceRefs: ['listing'],
      },
    ],
    nextMove: { summary: 'Confirm availability.' },
  }
}

function ArtifactStream() {
  const [earlierComplete, setEarlierComplete] = useState(false)
  const earlier: FoundUIMessage['parts'][number] = earlierComplete
    ? {
        type: 'tool-showCandidates',
        toolCallId: 'earlier',
        state: 'output-available',
        input: { candidates: [candidate('Earlier room')] },
        output: { presented: 1 },
      }
    : {
        type: 'tool-showCandidates',
        toolCallId: 'earlier',
        state: 'input-available',
        input: { candidates: [candidate('Earlier room')] },
      }
  const parts: FoundUIMessage['parts'] = [
    { type: 'text', text: earlierComplete ? 'Both options are ready.' : '' },
    earlier,
    {
      type: 'tool-showCandidates',
      toolCallId: 'later',
      state: 'output-available',
      input: { candidates: [candidate('Later room')] },
      output: { presented: 1 },
    },
    { type: 'text', text: '[Review source](https://example.com/room)' },
  ]
  return (
    <main className="mx-auto max-w-784 px-32 py-24">
      <button
        className="mb-24 rounded-6 border p-8"
        type="button"
        onClick={() => setEarlierComplete(true)}
      >
        Finish earlier call
      </button>
      <ThreadMessage
        message={message('response', 'assistant', parts, 'streaming')}
        threadId="fixture"
      />
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing fixture root')
createRoot(root).render(
  <StrictMode>
    <ConvexProvider client={client}>
      <ArtifactStream />
    </ConvexProvider>
  </StrictMode>,
)
