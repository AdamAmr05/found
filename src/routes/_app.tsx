import { Outlet, createFileRoute } from '@tanstack/react-router'

import { RequireAuth } from '~/features/auth/RequireAuth'
import { AppWorkspace } from '~/features/navigation/AppWorkspace'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <RequireAuth>
      <AppWorkspace>
        <Outlet />
      </AppWorkspace>
    </RequireAuth>
  )
}
