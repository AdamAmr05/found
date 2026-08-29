import { Link } from '@tanstack/react-router'

const navLinkClass =
  'rounded-8 px-10 py-8 text-label-small text-foreground-muted transition-colors hover:bg-background-lighter hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 data-[status=active]:bg-background-lighter data-[status=active]:text-accent-black'

export function FoundHeader({
  onNewThread,
}: {
  readonly onNewThread?: () => void
}) {
  return (
    <header className="z-20 shrink-0 border-b border-border-faint bg-background-base/90 backdrop-blur-xl">
      <div className="mx-auto flex h-64 max-w-1120 items-center justify-between px-20 sm:px-32">
        <Link className="text-label-large text-accent-black" to="/">
          found
        </Link>
        <nav
          className="flex items-center gap-6"
          aria-label="Primary navigation"
        >
          <Link className={navLinkClass} to="/bookmarks">
            Bookmarks
          </Link>
          <Link className={navLinkClass} to="/playground">
            Playground
          </Link>
          <Link className={`${navLinkClass} hidden sm:block`} to="/lab">
            Lab
          </Link>
          {onNewThread ? (
            <button
              className="rounded-8 border border-border-muted bg-background-lighter px-12 py-8 text-label-small text-accent-black transition-colors hover:border-border-loud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
              type="button"
              onClick={onNewThread}
            >
              New thread
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
