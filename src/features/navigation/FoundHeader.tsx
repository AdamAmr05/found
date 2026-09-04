import { Link } from '@tanstack/react-router'
import { BookmarkSimple, ChatCircleText, Tray } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { AccountControl } from '../auth/AccountControl'

const navLinkClass =
  'flex min-h-40 min-w-40 items-center justify-center rounded-8 px-10 py-8 text-label-small text-foreground-muted transition-colors hover:bg-background-lighter hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 data-[status=active]:bg-background-lighter data-[status=active]:text-accent-black'

export function FoundHeader({
  conversationControls,
}: {
  readonly conversationControls: ReactNode
}) {
  return (
    <header className="z-20 shrink-0 border-b border-border-faint bg-background-base/90 backdrop-blur-xl">
      <div className="flex h-64 items-center justify-between gap-2 px-8 sm:gap-12 sm:px-24">
        <div className="flex shrink-0 items-center gap-4 sm:gap-20">
          <Link className="text-label-large text-accent-black" to="/">
            found
          </Link>
          {conversationControls}
        </div>
        <nav
          className="flex min-w-0 items-center gap-2 sm:gap-6"
          aria-label="Primary navigation"
        >
          <Link
            className={navLinkClass}
            to="/"
            activeOptions={{ exact: true }}
            aria-label="Chat"
            title="Chat"
          >
            <ChatCircleText aria-hidden className="size-18 sm:hidden" />
            <span className="hidden sm:inline">Chat</span>
          </Link>
          <Link
            className={navLinkClass}
            to="/inbox"
            aria-label="Inbox"
            title="Inbox"
          >
            <Tray aria-hidden className="size-18 sm:hidden" />
            <span className="hidden sm:inline">Inbox</span>
          </Link>
          <Link
            className={navLinkClass}
            to="/bookmarks"
            aria-label="Bookmarks"
            title="Bookmarks"
          >
            <BookmarkSimple aria-hidden className="size-18 sm:hidden" />
            <span className="hidden sm:inline">Bookmarks</span>
          </Link>
          <AccountControl />
        </nav>
      </div>
    </header>
  )
}
