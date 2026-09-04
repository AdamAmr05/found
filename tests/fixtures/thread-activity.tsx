import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { ThreadTranscript } from '../../src/features/thread/ThreadTranscript'
import {
  brokenEmbeds,
  completedReads,
  message,
  prompt,
  places,
  reads,
  reply,
  searches,
} from './activity-messages'
import '../../src/styles/app.css'

type Stage =
  | 'Researching'
  | 'Between steps'
  | 'Writing'
  | 'Complete'
  | 'Next turn'
  | 'Failed'

function ActivityFixture() {
  const [stage, setStage] = useState<Stage>('Researching')
  const active = [
    'Researching',
    'Between steps',
    'Writing',
    'Next turn',
  ].includes(stage)
  const written = ['Writing', 'Complete', 'Next turn', 'Failed'].includes(stage)
  const messages = [
    prompt,
    message(
      'research',
      'assistant',
      [
        ...searches,
        ...(stage === 'Researching' ? reads : completedReads),
        ...(written ? [places] : []),
      ],
      'success',
    ),
    message(
      'answer',
      'assistant',
      written ? [...brokenEmbeds, reply] : [],
      stage === 'Failed' ? 'failed' : active ? 'streaming' : 'success',
    ),
    ...(stage === 'Next turn'
      ? [
          message('user-2', 'user', [
            { type: 'text', text: 'What about the commute?' },
          ]),
        ]
      : []),
  ]
  return (
    <main className="mx-auto max-w-784 px-20 py-32 sm:px-32">
      <nav aria-label="Fixture states" className="mb-32 flex flex-wrap gap-12">
        {(
          [
            'Researching',
            'Between steps',
            'Writing',
            'Complete',
            'Next turn',
            'Failed',
          ] as const
        ).map((value) => (
          <button
            key={value}
            type="button"
            className="rounded-6 border px-8 py-4"
            onClick={() => setStage(value)}
          >
            {value}
          </button>
        ))}
      </nav>
      <ThreadTranscript
        messages={messages}
        active={active}
        threadId="fixture"
      />
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing fixture root')
createRoot(root).render(
  <StrictMode>
    <ActivityFixture />
  </StrictMode>,
)
