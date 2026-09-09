import { createFileRoute } from '@tanstack/react-router'

import { BookmarksPage } from '~/features/saved-candidates/BookmarksPage'

export const Route = createFileRoute('/app/bookmarks')({
  component: BookmarksPage,
})
