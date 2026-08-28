import { AsciiAtmosphere } from '../materials/ascii/AsciiAtmosphere'

export function CandidateImageFallback({
  compact = false,
}: {
  compact?: boolean
}) {
  return (
    <div className="bg-background relative grid size-full place-items-center overflow-hidden">
      <AsciiAtmosphere
        color="#FA5D19"
        density="rich"
        opacity={0.82}
        seed={31}
        variant="signal"
      />
      {compact ? (
        <ImageIcon />
      ) : (
        <div className="bg-background/92 relative z-10 rounded-10 px-13 py-9 text-center shadow-[0_0_0_1px_rgb(38_38_38/0.08)] backdrop-blur-sm">
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
  return (
    <span className="bg-background/90 relative z-10 grid size-24 place-items-center rounded-7 text-heat-100 shadow-[0_0_0_1px_rgb(38_38_38/0.08)]">
      <svg aria-hidden className="size-13" viewBox="0 0 14 14">
        <path
          d="M2.5 3.25h9v7.5h-9zM3.5 9l2.25-2.25 1.5 1.5 1-1 2.25 2.25M9.5 5.25h.01"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1"
        />
      </svg>
    </span>
  )
}
