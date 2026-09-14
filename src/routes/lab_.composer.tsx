import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { ComposerLabScene } from '~/features/lab/composer/ComposerLabScene'
import '~/features/thread/thread-entry.css'

// The composer questionnaire now ships in the thread itself. This stage is
// kept for later tuning but not reachable; flip the guard to bring it back.
const COMPOSER_LAB_ENABLED = false

export const Route = createFileRoute('/lab_/composer')({
  beforeLoad: () => {
    if (import.meta.env.PROD || !COMPOSER_LAB_ENABLED) throw notFound()
  },
  component: ComposerLab,
})

function ComposerLab() {
  return (
    <div className="min-h-dvh bg-background-base">
      <nav className="sticky top-0 z-50 flex min-h-52 items-center justify-between border-b-1 border-black/8 bg-white/88 px-16 backdrop-blur-[12px] md:px-28">
        <div className="flex items-center gap-16">
          <Link
            className="text-label-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-heat-100"
            to="/app"
          >
            Back to chat
          </Link>
          <Link
            className="text-label-medium text-foreground-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-heat-100"
            to="/lab"
          >
            Representations
          </Link>
        </div>
        <div className="hidden items-center gap-8 font-mono text-mono-x-small text-foreground-muted sm:flex">
          <span className="size-6 rounded-full bg-heat-100" />
          Composer · questionnaire
        </div>
      </nav>
      <ComposerLabScene />
    </div>
  )
}
