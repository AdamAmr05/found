import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { SignOut } from '@phosphor-icons/react'

import { api } from '../../../convex/_generated/api'

export function AccountControl() {
  const viewer = useQuery(api.users.viewer)
  const { signOut } = useAuthActions()

  if (!viewer) return null

  return (
    <div className="ml-4 flex items-center gap-6 border-l border-border-faint pl-10">
      <span
        className="hidden max-w-160 truncate text-label-small text-accent-black sm:block"
        title={viewer.displayName}
      >
        {viewer.displayName}
      </span>
      <button
        aria-label="Sign out"
        title="Sign out"
        className="flex min-h-40 shrink-0 items-center justify-center rounded-8 px-10 py-8 text-label-small whitespace-nowrap text-foreground-muted transition-colors hover:bg-background-lighter hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
        type="button"
        onClick={() => void signOut().catch(globalThis.reportError)}
      >
        <SignOut aria-hidden className="size-18 sm:hidden" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  )
}
