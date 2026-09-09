import { createFileRoute } from '@tanstack/react-router'

import { InboxPage } from '~/features/outreach/InboxPage'

export const Route = createFileRoute('/app/inbox')({
  component: InboxPage,
})
