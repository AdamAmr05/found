import { Link } from '@tanstack/react-router'
import { EntryArrow } from './EntryArrow'
import { HeroAtmosphere } from './HeroAtmosphere'
import './landing.css'

export function LandingPage() {
  return (
    <main className="min-h-svh bg-accent-white p-12 text-accent-black md:p-20">
      <section
        aria-label="Found"
        className="relative isolate flex min-h-[calc(100svh-24px)] flex-col md:min-h-[calc(100svh-40px)]"
      >
        <div className="absolute inset-0 overflow-hidden rounded-20 bg-heat-100">
          <HeroAtmosphere />
          <div
            aria-hidden="true"
            className="landing-copy-shade absolute inset-0"
          />
        </div>
        <div
          aria-hidden="true"
          className="landing-scene pointer-events-none absolute bg-atmosphere-ink"
        />
        <header className="relative px-28 pt-28 text-atmosphere-ink md:px-64 md:pt-48">
          <span className="text-title-h5 font-medium tracking-[-0.5px]">
            found
          </span>
        </header>
        <div className="relative mt-auto px-28 pt-120 pb-144 text-atmosphere-ink md:px-64 md:pt-160 md:pb-64">
          <h1 className="landing-headline max-w-720 font-medium">
            A place for
            <br />
            what comes next.
          </h1>
          <p className="mt-24 max-w-340 text-body-large md:mt-32 md:max-w-380">
            Explore places to live, ask the questions that matter, and take the
            next step.
          </p>
        </div>
        <div className="landing-entry absolute right-0 bottom-0 h-76 w-208 rounded-tl-32 bg-accent-white pt-12 pl-12 md:w-228">
          <Link
            to="/app"
            className="inline-flex h-64 w-full items-center justify-between gap-16 rounded-20 border-[1.5px] border-accent-black/60 bg-accent-white px-24 text-label-large transition-colors duration-4 hover:border-accent-black hover:bg-background-base focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-black motion-reduce:transition-none"
          >
            Open found
            <EntryArrow />
          </Link>
        </div>
      </section>
    </main>
  )
}
