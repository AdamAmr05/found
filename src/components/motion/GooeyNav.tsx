import { Link, useLocation } from '@tanstack/react-router'
import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import {
  useEffect,
  useId,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'

// damped so nothing overshoots
const SPRING = { type: 'spring', stiffness: 200, damping: 28, mass: 1 } as const

// the neck has thinned to nothing by the time the gap is this far open
const NECK_BREAK = 0.22

// nominal viewBox height; the svg stretches to whatever the tile actually is
const NECK_H = 100

const FADE_IN = 'transition-colors duration-[400ms]'
const FADE_OUT = 'transition-colors duration-0'

// the group bar; `text-*` lets the neck svg inherit it through currentColor
const BAR = 'bg-background-lighter'
const BAR_TEXT = 'text-background-lighter'

const cn = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(' ')

export type GooeyNavItem = {
  readonly label: ReactNode
  readonly href: string
  readonly exact?: boolean
  readonly icon?: ReactNode
  readonly ariaLabel?: string
}

export type GooeyNavProps = Omit<ComponentProps<'nav'>, 'onChange'> & {
  readonly items: ReadonlyArray<GooeyNavItem>
  readonly labelClassName?: string
  readonly activeColor?: string
  readonly activeLabelColor?: string
  readonly separation?: number
  readonly radius?: number
}

// two concave curves pinching toward the middle, drawn in the gap the tiles leave
function neckPath(gap: number, span: number) {
  if (
    !Number.isFinite(gap) ||
    !Number.isFinite(span) ||
    gap <= 0 ||
    span <= 0
  ) {
    return ''
  }
  const waist = NECK_H * (1 - gap / (span * NECK_BREAK))
  if (waist <= 0) return ''
  const start = span - gap
  const mid = start + gap / 2
  return `M${start} 0 Q${mid} ${NECK_H - waist} ${span} 0 L${span} ${NECK_H} Q${mid} ${waist} ${start} ${NECK_H} Z`
}

type SegmentProps = {
  readonly gap: number
  readonly span: number
  readonly hasSeam: boolean
  readonly leftFill: string
  readonly rightFill: string
  readonly reduced: boolean
  readonly radii: Record<string, number>
  readonly className?: string
  readonly backgroundColor: string | undefined
  readonly children: ReactNode
}

function Segment({
  gap,
  span,
  hasSeam,
  leftFill,
  rightFill,
  reduced,
  radii,
  className,
  backgroundColor,
  children,
}: SegmentProps) {
  const marginLeft = useSpring(gap, SPRING)
  const gradientId = `gooey-neck-${useId().replace(/:/g, '')}`

  useEffect(() => {
    if (reduced) marginLeft.jump(gap)
    else marginLeft.set(gap)
  }, [gap, marginLeft, reduced])

  const d = useTransform(marginLeft, (g) => neckPath(g, span))

  return (
    <motion.li
      data-slot="gooey-nav-segment"
      className={cn('relative', className)}
      style={backgroundColor ? { backgroundColor, marginLeft } : { marginLeft }}
      initial={false}
      animate={radii}
      transition={reduced ? { duration: 0 } : SPRING}
    >
      {hasSeam && (
        <svg
          aria-hidden
          width={span}
          viewBox={`0 0 ${span} ${NECK_H}`}
          preserveAspectRatio="none"
          className={cn(
            'pointer-events-none absolute top-0 right-full h-full',
            BAR_TEXT,
          )}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1">
              <stop offset="0" stopColor={leftFill} />
              <stop offset="1" stopColor={rightFill} />
            </linearGradient>
          </defs>
          <motion.path d={d} fill={`url(#${gradientId})`} />
        </svg>
      )}
      {children}
    </motion.li>
  )
}

function isMatch(item: GooeyNavItem, pathname: string) {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

export function GooeyNav({
  items,
  labelClassName,
  activeColor = 'var(--color-heat-100)',
  activeLabelColor = 'var(--color-accent-white)',
  separation = 12,
  radius = 8,
  className,
  ...props
}: GooeyNavProps) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const reduced = useReducedMotion() ?? false

  const routeIndex = items.findIndex((item) => isMatch(item, pathname))
  const [active, setActive] = useState(() => Math.max(routeIndex, 0))
  const [seenRoute, setSeenRoute] = useState(routeIndex)

  // in render, not an effect: an effect here cascades renders
  if (routeIndex !== seenRoute) {
    setSeenRoute(routeIndex)
    if (routeIndex !== -1) setActive(routeIndex)
  }

  const open = (seam: number) =>
    seam === 0 ||
    seam === items.length ||
    seam - 1 === active ||
    seam === active

  const fill = (i: number) => (i === active ? activeColor : 'currentColor')

  return (
    <nav
      data-slot="gooey-nav"
      className={cn('inline-block', className)}
      {...props}
    >
      <ul className="flex items-center">
        {items.map((item, i) => {
          const isActive = i === active

          return (
            <Segment
              key={item.href}
              // closed seams pull in a pixel so no hairline shows through
              gap={i === 0 ? 0 : open(i) ? separation : -1}
              span={separation}
              hasSeam={i > 0}
              leftFill={fill(i - 1)}
              rightFill={fill(i)}
              reduced={reduced}
              radii={{
                borderTopLeftRadius: open(i) ? radius : 0,
                borderBottomLeftRadius: open(i) ? radius : 0,
                borderTopRightRadius: open(i + 1) ? radius : 0,
                borderBottomRightRadius: open(i + 1) ? radius : 0,
              }}
              className={cn(BAR, isActive ? FADE_IN : FADE_OUT)}
              backgroundColor={isActive ? activeColor : undefined}
            >
              <Link
                to={item.href}
                data-slot="gooey-nav-item"
                data-active={isActive}
                aria-label={item.ariaLabel}
                title={item.ariaLabel}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex cursor-pointer items-center justify-center whitespace-nowrap [&_svg]:shrink-0',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100',
                  isActive ? FADE_IN : FADE_OUT,
                  !isActive && 'text-foreground-muted hover:text-accent-black',
                  labelClassName,
                )}
                style={isActive ? { color: activeLabelColor } : undefined}
                onClick={() => setActive(i)}
              >
                {item.icon}
                {item.label}
              </Link>
            </Segment>
          )
        })}
      </ul>
    </nav>
  )
}
