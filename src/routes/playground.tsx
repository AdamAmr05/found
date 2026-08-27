import { createFileRoute, Link } from '@tanstack/react-router'
import { ThreadPrototype } from '~/features/playground/ThreadPrototype'

export const Route = createFileRoute('/playground')({
  component: Playground,
})

function Playground() {
  return (
    <div className="min-h-dvh bg-background-base">
      <nav className="backdrop-blur-12 sticky top-0 z-50 flex min-h-52 items-center justify-between border-b-1 border-black/8 bg-white/88 px-16 md:px-28">
        <Link
          className="text-label-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-heat-100"
          to="/"
        >
          found
        </Link>
        <div className="flex items-center gap-14">
          <Link
            className="rounded-8 px-8 py-6 text-label-small text-foreground-muted transition-colors hover:bg-black/4 hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
            to="/playground/materials/ascii"
          >
            ASCII material
          </Link>
          <div className="hidden items-center gap-8 font-mono text-mono-x-small text-foreground-muted sm:flex">
            <span className="size-6 rounded-full bg-accent-forest" />
            Berlin · live shortlist
          </div>
        </div>
      </nav>
      <ThreadPrototype />
    </div>
  )
}
