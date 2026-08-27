import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import type { Candidate, ClaimStatus } from './candidates'
import { euros, tallyClaims } from './candidates'
import { useCeiling } from './requirements'
import { settleTransition } from './motion'

/**
 * Status colour is a single decision. Every variant reads it from here so a
 * contradiction never means one thing in the ledger and another in the deck.
 */
export const claimFill = {
  confirmed: 'bg-accent-forest',
  claimed: 'bg-accent-honey',
  contradicted: 'bg-accent-crimson',
  unknown: 'bg-black/18',
} satisfies Record<ClaimStatus, string>

export const claimText = {
  confirmed: 'text-accent-forest',
  claimed: 'text-accent-honey',
  contradicted: 'text-accent-crimson',
  unknown: 'text-foreground-muted',
} satisfies Record<ClaimStatus, string>

export const claimWord = {
  confirmed: 'Confirmed',
  claimed: 'Claimed only',
  contradicted: 'Sources disagree',
  unknown: 'Nothing found',
} satisfies Record<ClaimStatus, string>

export function StatusDot({
  status,
  className = 'size-7',
}: {
  readonly status: ClaimStatus
  readonly className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`shrink-0 rounded-full ${claimFill[status]} ${className}`}
    />
  )
}

/**
 * The evidence meter. Proportional rather than a score: four confirmed claims
 * and four contradictions must not collapse into the same number.
 */
export function EvidenceMeter({
  candidate,
  className = '',
}: {
  readonly candidate: Candidate
  readonly className?: string
}) {
  const tally = tallyClaims(candidate)
  const order: readonly ClaimStatus[] = [
    'confirmed',
    'claimed',
    'contradicted',
    'unknown',
  ]

  return (
    <span className={`flex ${className}`}>
      <span className="sr-only">
        {tally.confirmed} of {tally.total} requirements confirmed,{' '}
        {tally.contradicted} contradicted
      </span>
      <span aria-hidden="true" className="flex h-4 w-full gap-2 rounded-full">
        {order.map((status) => {
          const count = tally[status]
          if (count === 0) return null

          return (
            <motion.span
              key={status}
              className={`h-full rounded-full ${claimFill[status]}`}
              layout
              style={{ flexGrow: count }}
              transition={settleTransition}
            />
          )
        })}
      </span>
    </span>
  )
}

/** Cost is the axis every variant sorts against, so it renders identically. */
export function CostReadout({
  candidate,
  align = 'right',
}: {
  readonly candidate: Candidate
  readonly align?: 'left' | 'right'
}) {
  const ceiling = useCeiling()
  const over = candidate.allIn - ceiling

  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <p className="font-mono text-mono-medium tabular-nums">
        {euros(candidate.allIn)}
      </p>
      <p
        className={`text-label-x-small ${
          over > 0 ? 'text-accent-crimson' : 'text-foreground-muted'
        }`}
      >
        {over > 0
          ? `${euros(over)} over ceiling`
          : `${euros(-over)} under ceiling`}
      </p>
    </div>
  )
}

export function Meta({ children }: { readonly children: ReactNode }) {
  return (
    <span className="font-mono text-mono-x-small text-foreground-muted">
      {children}
    </span>
  )
}

/**
 * Focus, for the variants that show many peers at once. It is a hairline on the
 * surface's own edge rather than a marker stuck to its side, and it is one
 * element that travels, so moving focus reads as the same attention moving
 * rather than two separate surfaces changing state.
 *
 * Variants that only ever show one candidate do not render it: there is nothing
 * to distinguish it from.
 */
export function FocusRing({ radius }: { readonly radius: number }) {
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-20"
      layoutId="lab-focus-ring"
      /* sRGB fallback for the heat token: a ring is a hairline, not a surface. */
      style={{
        borderRadius: radius,
        boxShadow: 'inset 0 0 0 1px rgb(250 93 25 / 0.5)',
      }}
      transition={settleTransition}
    />
  )
}
