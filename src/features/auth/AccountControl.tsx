import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'

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
        className="rounded-8 px-10 py-8 text-label-small text-foreground-muted transition-colors hover:bg-background-lighter hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
        type="button"
        onClick={() => void signOut().catch(globalThis.reportError)}
      >
        Sign out
      </button>
    </div>
  )
}
