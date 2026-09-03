import { useConvexAuth } from 'convex/react'
import type { ReactNode } from 'react'

import { SignInPage } from './SignInPage'

// Every user-owned surface renders behind this gate, so its Convex queries
// only subscribe once a verified session exists.
export function RequireAuth({ children }: { readonly children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background-base">
        <p className="font-mono text-mono-small text-foreground-muted">
          Checking your session…
        </p>
      </main>
    )
  }
  if (!isAuthenticated) return <SignInPage />
  return children
}
