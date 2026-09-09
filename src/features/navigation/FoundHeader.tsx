import { Link } from '@tanstack/react-router'
import { BookmarkSimple, ChatCircleText, Tray } from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { GooeyNav, type GooeyNavItem } from '../../components/motion/GooeyNav'
import { AccountControl } from '../auth/AccountControl'

const navItems: ReadonlyArray<GooeyNavItem> = [
  {
    href: '/app',
    exact: true,
    ariaLabel: 'Chat',
    icon: <ChatCircleText aria-hidden className="size-18 sm:hidden" />,
    label: <span className="hidden sm:inline">Chat</span>,
  },
  {
    href: '/app/inbox',
    ariaLabel: 'Inbox',
    icon: <Tray aria-hidden className="size-18 sm:hidden" />,
    label: <span className="hidden sm:inline">Inbox</span>,
  },
  {
    href: '/app/bookmarks',
    ariaLabel: 'Bookmarks',
    icon: <BookmarkSimple aria-hidden className="size-18 sm:hidden" />,
    label: <span className="hidden sm:inline">Bookmarks</span>,
  },
]

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
        <div className="flex min-w-0 items-center gap-2 sm:gap-6">
          <GooeyNav
            aria-label="Primary navigation"
            items={navItems}
            separation={2}
            labelClassName="min-h-40 min-w-40 px-10 py-8 text-label-small"
          />
          <AccountControl />
        </div>
      </div>
    </header>
  )
}
