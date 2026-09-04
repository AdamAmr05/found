import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import ThreadMarkdown from '../../src/features/thread/ThreadMarkdown'
import '../../src/styles/app.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing fixture root')

createRoot(root).render(
  <StrictMode>
    <main className="mx-auto max-w-720 p-24 text-body-large text-accent-black">
      <ThreadMarkdown
        streaming={false}
        text="[View listing and message the advertiser](https://www.wg-gesucht.de/wg-zimmer-in-Ulm-Weststadt.14022135.html)"
      />
    </main>
  </StrictMode>,
)
