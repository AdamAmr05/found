import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="grid min-h-dvh place-items-center p-24">
      <div className="max-w-560">
        <p className="mb-12 text-label-small text-heat-100">
          Find a place in Berlin
        </p>
        <h1 className="text-title-h2 text-accent-black">found</h1>
        <p className="mt-16 max-w-480 text-body-large text-foreground-muted">
          Compare total cost, commute, registration, and the questions each
          listing leaves unanswered.
        </p>
        <div className="mt-24 flex flex-wrap items-center gap-16">
          <Link
            className="flex min-h-46 w-fit items-center rounded-8 bg-heat-100 px-16 text-label-medium text-white shadow-[0_2px_6px_rgba(250,93,25,0.22)] transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 active:scale-[0.98]"
            to="/playground"
          >
            Explore the shortlist
          </Link>
          <Link
            className="rounded-8 px-4 py-8 text-label-medium text-foreground-muted transition-colors hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100"
            to="/playground/materials/ascii"
          >
            View interface materials →
          </Link>
        </div>
      </div>
    </main>
  )
}
