import { Outlet, createFileRoute } from '@tanstack/react-router'

import { RequireAuth } from '~/features/auth/RequireAuth'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  )
}
