import { Image } from '@phosphor-icons/react'

import { AsciiFireCanvas } from '~/components/materials/ascii-fire/AsciiFireCanvas'

export function CandidateImageFallback({
  compact = false,
}: {
  compact?: boolean
}) {
  return (
    <div className="relative grid size-full place-items-center overflow-hidden rounded-[inherit] bg-background-base shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-10 overflow-clip select-none"
      >
        <div
          className={
            compact
              ? 'absolute -bottom-20 left-1/2 h-120 w-348 -translate-x-1/2'
              : 'absolute -bottom-40 left-1/2 h-240 w-696 -translate-x-1/2'
          }
        >
          <div className={compact ? 'origin-top-left scale-50' : ''}>
            <AsciiFireCanvas />
          </div>
        </div>
      </div>
      {compact ? (
        <span className="relative z-10 grid size-36 place-items-center rounded-full bg-background-base text-heat-100">
          <ImageIcon />
        </span>
      ) : (
        <div className="relative z-10 bg-background-base px-13 py-9 text-center">
          <span className="mx-auto grid size-24 place-items-center text-heat-100">
            <ImageIcon />
          </span>
          <p className="text-label-small text-accent-black">No usable image</p>
          <p className="mt-2 font-mono text-mono-x-small text-foreground-muted">
            source preview unavailable
          </p>
        </div>
      )}
    </div>
  )
}

function ImageIcon() {
  return <Image aria-hidden className="size-14" weight="regular" />
}
