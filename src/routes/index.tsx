import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <main className="grid min-h-dvh place-items-center p-24">
      <div className="max-w-560">
        <p className="mb-12 text-label-small text-heat-100">Working title</p>
        <h1 className="text-title-h2 text-accent-black">Threshold</h1>
        <p className="mt-16 max-w-480 text-body-large text-foreground-muted">
          The foundation is ready. The product model comes next.
        </p>
      </div>
    </main>
  )
}
