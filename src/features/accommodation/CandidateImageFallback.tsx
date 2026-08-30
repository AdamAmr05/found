import { Image } from '@phosphor-icons/react'

import { AsciiAtmosphere } from '../materials/ascii/AsciiAtmosphere'

export function CandidateImageFallback({
  compact = false,
}: {
  compact?: boolean
}) {
  return (
    <div className="relative grid size-full place-items-center overflow-hidden rounded-[inherit] bg-background-base shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]">
      <AsciiAtmosphere
        color="#FA5D19"
        density={compact ? 'quiet' : 'rich'}
        opacity={compact ? 0.68 : 0.82}
        seed={31}
        variant="signal"
      />
      {compact ? (
        <span className="relative z-10 grid size-24 place-items-center bg-background-base text-heat-100">
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
