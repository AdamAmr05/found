import {
  ArrowUUpLeft,
  CaretRight,
  ChatCircleDots,
  Check,
  DotsSixVertical,
  GlobeSimple,
  Path,
  Plus,
  Stack,
  X,
  type IconProps,
} from '@phosphor-icons/react'

const iconDefaults = {
  'aria-hidden': true,
  size: '1em',
  weight: 'regular',
} as const

export function PlusIcon(props: IconProps) {
  return <Plus {...iconDefaults} {...props} />
}

export function CheckIcon(props: IconProps) {
  return <Check {...iconDefaults} {...props} />
}

export function CloseIcon(props: IconProps) {
  return <X {...iconDefaults} {...props} />
}

export function ChevronIcon(props: IconProps) {
  return <CaretRight {...iconDefaults} {...props} />
}

export function AskIcon(props: IconProps) {
  return <ChatCircleDots {...iconDefaults} {...props} />
}

export function RouteIcon(props: IconProps) {
  return <Path {...iconDefaults} {...props} />
}

export function SourceIcon(props: IconProps) {
  return <GlobeSimple {...iconDefaults} {...props} />
}

export function GripIcon(props: IconProps) {
  return <DotsSixVertical {...iconDefaults} {...props} />
}

export function UndoIcon(props: IconProps) {
  return <ArrowUUpLeft {...iconDefaults} {...props} />
}

export function LayersIcon(props: IconProps) {
  return <Stack {...iconDefaults} {...props} />
}
