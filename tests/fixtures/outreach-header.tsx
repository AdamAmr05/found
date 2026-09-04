import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { OutreachDraftHeader } from '../../src/features/outreach/OutreachDraftHeader'
import '../../src/styles/app.css'

function OutreachHeaderFixture() {
  const [asking, setAsking] = useState(false)
  const [instruction, setInstruction] = useState('')
  const [result, setResult] = useState('')

  return (
    <main className="mx-auto max-w-784 px-20 py-32 sm:px-32">
      <section
        aria-label="Email draft"
        className="overflow-hidden rounded-16 bg-background-lighter shadow-surface-artifact"
      >
        <OutreachDraftHeader
          asking={asking}
          busy={undefined}
          instruction={instruction}
          locked={false}
          sendDisabled={false}
          state="draft"
          onAskingChange={setAsking}
          onInstructionChange={setInstruction}
          onCopy={() => setResult('Copied')}
          onCheckStatus={() => setResult('Checked')}
          onSend={() => setResult('Send selected')}
          onRevise={() => {
            setResult(instruction)
            setAsking(false)
          }}
        />
        <div className="px-16 pb-20 sm:px-20">
          <p className="flex min-h-54 items-center gap-24 border-b border-border-faint text-body-large">
            <span className="w-24 text-label-medium">To</span>
            hello@example.com
          </p>
          <p className="flex min-h-54 items-center border-b border-border-faint text-body-large">
            Enquiry about Sample 1234
          </p>
          <p className="mt-16 text-body-large whitespace-pre-wrap">
            {
              'Hi,\n\nCould you please share availability, lease terms, and any additional fees?\n\nBest regards,\nAdam'
            }
          </p>
        </div>
      </section>
      <output className="mt-16 block text-body-medium">{result}</output>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Missing fixture root')
createRoot(root).render(
  <StrictMode>
    <OutreachHeaderFixture />
  </StrictMode>,
)
