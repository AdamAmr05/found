import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const sharedProps = {
  'aria-hidden': true,
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 1.7,
  viewBox: '0 0 24 24',
} as const

export function ArrowIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

export function ChevronIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

export function LocateIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <path d="M3.5 12h17M12 3.5v17" />
    </svg>
  )
}

export function RouteIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h3a2 2 0 0 0 2-2V8a2 2 0 0 1 2-2h1" />
    </svg>
  )
}

export function SourceIcon(props: IconProps) {
  return (
    <svg {...sharedProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  )
}
