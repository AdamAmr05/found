import {
  ArrowRight,
  CaretLeft,
  Check,
  Crosshair,
  GlobeSimple,
  Path,
  Plus,
  type IconProps,
} from '@phosphor-icons/react'

const iconDefaults = {
  'aria-hidden': true,
  size: '1em',
  weight: 'regular',
} as const

export function ArrowIcon(props: IconProps) {
  return <ArrowRight {...iconDefaults} {...props} />
}

export function CheckIcon(props: IconProps) {
  return <Check {...iconDefaults} {...props} />
}

export function ChevronIcon(props: IconProps) {
  return <CaretLeft {...iconDefaults} {...props} />
}

export function LocateIcon(props: IconProps) {
  return <Crosshair {...iconDefaults} {...props} />
}

export function PlusIcon(props: IconProps) {
  return <Plus {...iconDefaults} {...props} />
}

export function RouteIcon(props: IconProps) {
  return <Path {...iconDefaults} {...props} />
}

export function SourceIcon(props: IconProps) {
  return <GlobeSimple {...iconDefaults} {...props} />
}
