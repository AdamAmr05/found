import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const strokeIcon = {
  'aria-hidden': true,
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeWidth: 1.7,
  viewBox: '0 0 24 24',
} as const

export function PlusIcon(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

export function ChevronIcon(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

export function AskIcon(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
      <path d="M10 10a2 2 0 1 1 2.6 1.9c-.4.2-.6.5-.6.9v.4" />
    </svg>
  )
}

export function RouteIcon(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h3a2 2 0 0 0 2-2V8a2 2 0 0 1 2-2h1" />
    </svg>
  )
}

export function SourceIcon(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  )
}

export function GripIcon(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <path d="M9 5v14M15 5v14" />
    </svg>
  )
}

export function UndoIcon(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <path d="M4 8h11a5 5 0 0 1 0 10h-6" />
      <path d="m8 4-4 4 4 4" />
    </svg>
  )
}

export function LayersIcon(props: IconProps) {
  return (
    <svg {...strokeIcon} {...props}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 14 9 5 9-5" />
    </svg>
  )
}
