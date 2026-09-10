import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { InboxPage } from '../../src/features/outreach/InboxPage'
import '../../src/styles/app.css'

// The browser test supplies pages at the external WebSocket boundary.
const client = new ConvexReactClient('https://inbox-fixture.convex.cloud')
const root = document.getElementById('root')
if (!root) throw new Error('Missing fixture root')
createRoot(root).render(
  <StrictMode>
    <ConvexProvider client={client}>
      <InboxPage />
    </ConvexProvider>
  </StrictMode>,
)
