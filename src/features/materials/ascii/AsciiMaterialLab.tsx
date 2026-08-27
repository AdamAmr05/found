import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AsciiAtmosphere } from './AsciiAtmosphere'
import type { AsciiAtmosphereDensity } from './asciiField'

const densityOptions: readonly AsciiAtmosphereDensity[] = [
  'quiet',
  'balanced',
  'rich',
]

const tones = {
  gray: 'rgba(0, 0, 0, 0.2)',
  heat: '#FA5D19',
} as const

type Tone = keyof typeof tones
const toneOptions: readonly Tone[] = ['heat', 'gray']

export function AsciiMaterialLab() {
  const [density, setDensity] = useState<AsciiAtmosphereDensity>('balanced')
  const [tone, setTone] = useState<Tone>('heat')
  const color = tones[tone]

  return (
    <div className="min-h-dvh bg-background-base pb-120">
      <nav className="backdrop-blur-12 sticky top-0 z-50 flex min-h-52 items-center justify-between border-b-1 border-black/8 bg-background-base/92 px-16 md:px-28">
        <Link
          className="text-label-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-heat-100"
          to="/playground"
        >
          ← Playground
        </Link>
        <span className="font-mono text-mono-x-small tracking-[0.06em] text-foreground-muted uppercase">
          Material 01 · ASCII atmosphere
        </span>
      </nav>

      <main className="mx-auto w-full max-w-1240 px-16 pt-32 md:px-28 md:pt-52">
        <header className="mb-28 grid gap-20 border-b-1 border-black/8 pb-28 md:grid-cols-[1fr_400px] md:items-end">
          <div>
            <p className="mb-10 font-mono text-mono-x-small tracking-[0.08em] text-heat-100 uppercase">
              ASCII atmosphere
            </p>
            <h1 className="max-w-760 text-title-h2 text-balance">
              Motion for search, focus, and activity.
            </h1>
          </div>
          <p className="max-w-400 text-body-large text-pretty text-foreground-muted md:justify-self-end">
            Complete ASCII frames morph through coherent forms as fragmented
            sources condense into one inspectable object.
          </p>
        </header>

        <div className="mb-14 flex flex-wrap items-center justify-between gap-12">
          <ControlGroup label="Density">
            {densityOptions.map((option) => (
              <MaterialControl
                key={option}
                active={density === option}
                label={option}
                onClick={() => setDensity(option)}
              />
            ))}
          </ControlGroup>
          <ControlGroup label="Color">
            {toneOptions.map((option) => (
              <MaterialControl
                key={option}
                active={tone === option}
                label={option}
                onClick={() => setTone(option)}
                swatch={tones[option]}
              />
            ))}
          </ControlGroup>
        </div>

        <section className="relative min-h-540 overflow-hidden rounded-20 bg-white shadow-[0_0_0_1px_rgba(38,38,38,0.06),0_18px_54px_rgba(38,38,38,0.06)]">
          <AsciiAtmosphere color={color} density={density} />
          <div className="relative z-10 flex min-h-540 flex-col items-center justify-center px-24 py-64 text-center">
            <div className="mb-18 flex items-center gap-8 rounded-full bg-background-base px-12 py-6 font-mono text-mono-x-small text-foreground-muted shadow-[0_0_0_1px_rgba(38,38,38,0.06)]">
              <span className="size-6 rounded-full bg-heat-100" />
              31 sources · search complete
            </div>
            <h2 className="max-w-680 text-title-h1 text-balance">
              A place is more than its listing.
            </h2>
            <p className="mt-16 max-w-500 text-body-large text-pretty text-foreground-muted">
              Cost, commute, evidence, neighborhood, and unanswered questions
              become one calm surface.
            </p>
          </div>
          <div className="absolute inset-x-16 bottom-14 z-10 flex flex-col items-start gap-2 font-mono text-mono-x-small text-foreground-muted md:inset-x-20 md:flex-row md:items-center md:justify-between">
            <span>Single-color frame sequence</span>
            <span>85 ms · 8×10 grid · visibility paused</span>
          </div>
        </section>

        <section className="mt-52">
          <div className="mb-18 flex items-end justify-between gap-20">
            <div>
              <p className="mb-8 font-mono text-mono-x-small tracking-[0.08em] text-heat-100 uppercase">
                Field grammar
              </p>
              <h2 className="text-title-h3 text-balance">Four spatial roles</h2>
            </div>
            <p className="hidden max-w-380 text-body-medium text-pretty text-foreground-muted md:block">
              These are material states, not four decorative backgrounds to
              stack together.
            </p>
          </div>
          <div className="grid gap-14 md:grid-cols-2 xl:grid-cols-4">
            <MaterialVariant
              color={color}
              description="Leaves the decision surface quiet while evidence gathers around it."
              label="Converge"
              variant="converge"
            />
            <MaterialVariant
              color={color}
              description="Occupies unused flanks without becoming a wallpaper texture."
              label="Margin"
              variant="margin"
            />
            <MaterialVariant
              color={color}
              description="A denser local field for an active acquisition or reasoning state."
              label="Signal"
              variant="signal"
            />
            <MaterialVariant
              color={color}
              description="A bottom-anchored flame whose tongues split, bend, and recombine."
              label="Flame"
              variant="flame"
            />
          </div>
        </section>

        <section className="mt-64 border-t-1 border-black/8 pt-34">
          <div className="mb-28 grid gap-16 md:grid-cols-[1fr_420px] md:items-end">
            <div>
              <p className="mb-8 font-mono text-mono-x-small tracking-[0.08em] text-heat-100 uppercase">
                Typography
              </p>
              <h2 className="text-title-h3 text-balance">
                Switzer heading scale
              </h2>
            </div>
            <p className="text-body-medium text-pretty text-foreground-muted">
              Switzer carries the heading scale at 500 weight, with fixed line
              heights and letter spacing for each role.
            </p>
          </div>
          <div className="divide-y-1 divide-black/8 border-y-1 border-black/8">
            <HeadingSpecimen className="text-title-h1" label="H1 · 60/64" />
            <HeadingSpecimen className="text-title-h2" label="H2 · 52/56" />
            <HeadingSpecimen className="text-title-h3" label="H3 · 40/44" />
            <HeadingSpecimen className="text-title-h4" label="H4 · 32/36" />
            <HeadingSpecimen className="text-title-h5" label="H5 · 24/32" />
          </div>
        </section>
      </main>
    </div>
  )
}

function ControlGroup({
  children,
  label,
}: {
  readonly children: React.ReactNode
  readonly label: string
}) {
  return (
    <fieldset className="flex items-center gap-4 rounded-10 bg-black/4 p-3">
      <legend className="sr-only">{label}</legend>
      <span className="px-8 font-mono text-mono-x-small text-foreground-muted">
        {label}
      </span>
      {children}
    </fieldset>
  )
}

function MaterialControl({
  active,
  label,
  onClick,
  swatch,
}: {
  readonly active: boolean
  readonly label: string
  readonly onClick: () => void
  readonly swatch?: string
}) {
  return (
    <button
      aria-pressed={active}
      className={`flex min-h-40 items-center gap-7 rounded-8 px-12 text-label-small capitalize transition-[background-color,box-shadow,scale] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 active:scale-[0.96] ${
        active
          ? 'bg-white shadow-[0_1px_3px_rgba(38,38,38,0.1)]'
          : 'text-foreground-muted hover:bg-black/4'
      }`}
      onClick={onClick}
      type="button"
    >
      {swatch ? (
        <span
          aria-hidden="true"
          className="size-8 rounded-full"
          style={{ backgroundColor: swatch }}
        />
      ) : null}
      {label}
    </button>
  )
}

function MaterialVariant({
  color,
  description,
  label,
  variant,
}: {
  readonly color: string
  readonly description: string
  readonly label: string
  readonly variant: 'converge' | 'flame' | 'margin' | 'signal'
}) {
  return (
    <article className="overflow-hidden rounded-16 bg-white shadow-[0_0_0_1px_rgba(38,38,38,0.06),0_8px_28px_rgba(38,38,38,0.04)]">
      <div className="relative h-280 bg-background-base">
        <AsciiAtmosphere
          color={color}
          density="balanced"
          seed={variant.length * 13}
          variant={variant}
        />
      </div>
      <div className="p-18">
        <h3 className="text-title-h5">{label}</h3>
        <p className="mt-6 text-body-medium text-pretty text-foreground-muted">
          {description}
        </p>
      </div>
    </article>
  )
}

function HeadingSpecimen({
  className,
  label,
}: {
  readonly className: string
  readonly label: string
}) {
  return (
    <div className="grid gap-10 py-22 md:grid-cols-[120px_1fr] md:items-baseline">
      <span className="font-mono text-mono-x-small text-foreground-muted">
        {label}
      </span>
      <p className={`${className} text-balance`}>A clearer way to choose.</p>
    </div>
  )
}
