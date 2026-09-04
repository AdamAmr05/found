import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { LabScene } from '~/features/lab/LabScene'

export const Route = createFileRoute('/lab')({
  beforeLoad: () => {
    if (import.meta.env.PROD) throw notFound()
  },
  component: Lab,
})

function Lab() {
  return (
    <div className="min-h-dvh bg-background-base">
      <nav className="sticky top-0 z-50 flex min-h-52 items-center justify-between border-b-1 border-black/8 bg-white/88 px-16 backdrop-blur-[12px] md:px-28">
        <Link
          className="text-label-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-heat-100"
          to="/"
        >
          Back to chat
        </Link>
        <div className="flex items-center gap-8 font-mono text-mono-x-small text-foreground-muted">
          <span className="size-6 rounded-full bg-heat-100" />
          Berlin search · six places
        </div>
      </nav>
      <LabScene />
    </div>
  )
}
