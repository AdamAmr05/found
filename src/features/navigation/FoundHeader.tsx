import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { AccountControl } from '../auth/AccountControl'

const navLinkClass =
  'rounded-8 px-10 py-8 text-label-small text-foreground-muted transition-colors hover:bg-background-lighter hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 data-[status=active]:bg-background-lighter data-[status=active]:text-accent-black'

export function FoundHeader({
  conversationControls,
}: {
  readonly conversationControls?: ReactNode
}) {
  return (
    <header className="z-20 shrink-0 border-b border-border-faint bg-background-base/90 backdrop-blur-xl">
      <div
        className={`mx-auto flex h-64 items-center justify-between gap-12 ${conversationControls ? 'px-16 sm:px-24' : 'max-w-1120 px-20 sm:px-32'}`}
      >
        <div className="flex shrink-0 items-center gap-12 sm:gap-20">
          <Link className="text-label-large text-accent-black" to="/">
            found
          </Link>
          {conversationControls}
        </div>
        <nav
          className="flex min-w-0 items-center gap-2 sm:gap-6"
          aria-label="Primary navigation"
        >
          <Link className={navLinkClass} to="/inbox">
            Inbox
          </Link>
          <Link className={navLinkClass} to="/bookmarks">
            Bookmarks
          </Link>
          <Link
            className={`${navLinkClass} ${conversationControls ? 'hidden sm:block' : ''}`}
            to="/playground"
          >
            Playground
          </Link>
          <Link className={`${navLinkClass} hidden sm:block`} to="/lab">
            Lab
          </Link>
          <AccountControl />
        </nav>
      </div>
    </header>
  )
}
