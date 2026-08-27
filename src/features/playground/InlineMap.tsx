import { motion, useReducedMotion } from 'motion/react'
import type { Accommodation, AccommodationId } from './accommodation'
import { LocateIcon, RouteIcon } from './icons'

interface InlineMapProps {
  readonly accommodations: readonly Accommodation[]
  readonly selectedId: AccommodationId
  readonly onSelect: (id: AccommodationId) => void
}

export function InlineMap({
  accommodations,
  selectedId,
  onSelect,
}: InlineMapProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section
      aria-label="Accommodation area map"
      className="overflow-hidden rounded-16 bg-[#eee9df] shadow-[0_0_0_1px_rgba(38,38,38,0.08),0_12px_32px_rgba(38,38,38,0.06)]"
    >
      <div className="backdrop-blur-8 flex min-h-48 items-center justify-between border-b-1 border-black/8 bg-white/92 px-16 py-10">
        <div className="flex items-center gap-8">
          <LocateIcon className="size-16 text-heat-100" />
          <p className="text-label-small">Berlin · commute to TU</p>
        </div>
        <div className="flex items-center gap-6 text-label-x-small text-foreground-muted">
          <RouteIcon className="size-14" />
          Travel times to TU Berlin
        </div>
      </div>

      <div className="relative h-328 overflow-hidden md:h-372">
        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
          viewBox="0 0 900 420"
        >
          <rect fill="#eee9df" height="420" width="900" />
          <path
            d="M-20 315C120 270 180 336 310 296c124-38 202-112 340-84 98 20 164 8 270-62"
            fill="none"
            stroke="#c4d5d8"
            strokeWidth="34"
          />
          <path
            d="M-20 315C120 270 180 336 310 296c124-38 202-112 340-84 98 20 164 8 270-62"
            fill="none"
            stroke="#dbe7e8"
            strokeWidth="22"
          />
          <g fill="none" stroke="#d1cabd" strokeWidth="9">
            <path d="M64-30 224 450" />
            <path d="M238-30 334 450" />
            <path d="M454-30 424 450" />
            <path d="M672-30 520 450" />
            <path d="M844-30 662 450" />
            <path d="M-20 76 920 24" />
            <path d="M-20 170 920 116" />
            <path d="M-20 250 920 312" />
            <path d="M-20 388 920 340" />
          </g>
          <g fill="none" stroke="#faf8f2" strokeWidth="5">
            <path d="M64-30 224 450" />
            <path d="M238-30 334 450" />
            <path d="M454-30 424 450" />
            <path d="M672-30 520 450" />
            <path d="M844-30 662 450" />
            <path d="M-20 76 920 24" />
            <path d="M-20 170 920 116" />
            <path d="M-20 250 920 312" />
            <path d="M-20 388 920 340" />
          </g>
          <g fill="#ded8cc" opacity="0.72">
            <rect
              height="64"
              rx="5"
              transform="rotate(-6 108 92)"
              width="112"
              x="108"
              y="92"
            />
            <rect
              height="72"
              rx="5"
              transform="rotate(-5 300 64)"
              width="98"
              x="300"
              y="64"
            />
            <rect
              height="82"
              rx="5"
              transform="rotate(-7 530 72)"
              width="126"
              x="530"
              y="72"
            />
            <rect
              height="76"
              rx="5"
              transform="rotate(-9 690 244)"
              width="138"
              x="690"
              y="244"
            />
            <rect
              height="58"
              rx="5"
              transform="rotate(-4 334 320)"
              width="118"
              x="334"
              y="320"
            />
          </g>
          <path
            d="M394 270C470 244 548 196 636 126"
            fill="none"
            stroke="#fa5d19"
            strokeDasharray="2 10"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </svg>

        <p className="absolute top-[13%] left-[8%] -rotate-3 font-mono text-mono-x-small tracking-[0.08em] text-black/36 uppercase">
          Kreuzberg
        </p>
        <p className="absolute top-[14%] right-[9%] rotate-2 font-mono text-mono-x-small tracking-[0.08em] text-black/36 uppercase">
          Prenzlauer Berg
        </p>
        <p className="absolute bottom-[13%] left-[35%] rotate-2 font-mono text-mono-x-small tracking-[0.08em] text-black/36 uppercase">
          Neukölln
        </p>

        <div className="absolute top-[39%] left-[15%] flex items-center gap-8 rounded-full bg-accent-black px-12 py-8 text-label-x-small text-white shadow-[0_6px_20px_rgba(38,38,38,0.18)]">
          <span className="size-6 rounded-full bg-heat-100" />
          TU Berlin
        </div>

        {accommodations.map((accommodation) => {
          const isSelected = accommodation.id === selectedId

          return (
            <motion.button
              key={accommodation.id}
              aria-label={`Select ${accommodation.name}, €${accommodation.allIn} all in per month`}
              aria-pressed={isSelected}
              className="absolute z-10 flex min-h-44 -translate-x-1/2 -translate-y-1/2 items-center rounded-full bg-white pr-12 pl-5 text-label-small shadow-[0_2px_4px_rgba(38,38,38,0.08),0_8px_24px_rgba(38,38,38,0.12)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100"
              animate={{
                scale: isSelected ? 1 : 0.92,
                y: isSelected && !prefersReducedMotion ? -5 : 0,
              }}
              onClick={() => onSelect(accommodation.id)}
              style={{
                left: `${accommodation.mapPosition.x}%`,
                top: `${accommodation.mapPosition.y}%`,
              }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              type="button"
            >
              <span
                className={`mr-8 grid size-34 place-items-center rounded-full font-mono text-mono-x-small ${
                  isSelected
                    ? 'bg-heat-100 text-white'
                    : 'bg-black/6 text-accent-black'
                }`}
              >
                {accommodation.commuteMinutes}m
              </span>
              €{accommodation.allIn.toLocaleString('en-US')}
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}
