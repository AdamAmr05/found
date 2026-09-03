import { createFileRoute } from '@tanstack/react-router'

import { FoundThread } from '~/features/thread/FoundThread'

export const Route = createFileRoute('/_app/')({
  component: FoundThread,
})
