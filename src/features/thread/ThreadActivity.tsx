import { CaretDown, MagnifyingGlass } from '@phosphor-icons/react'
import { ThinkingOrb, type OrbState } from 'thinking-orbs'

import { MapsGroundingSources } from './MapsGroundingPart'
import { groupActivity, type ActivityPart } from './activityModel'
import './thread-activity.css'

export function ThreadActivity({
  parts,
  active,
}: {
  readonly parts: readonly ActivityPart[]
  readonly active: boolean
}) {
  if (parts.length === 0) return null
  const groups = groupActivity(parts, active)
  return (
    <details
      className="thread-activity group text-body-medium text-foreground-muted"
      open={active}
    >
      <summary className="flex w-fit cursor-pointer list-none items-center gap-8 rounded-6 py-6 transition-colors hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 [&::-webkit-details-marker]:hidden">
        <MagnifyingGlass aria-hidden className="size-16" />
        <span>{active ? 'Researching' : 'Research activity'}</span>
        <span className="text-label-x-small tabular-nums">{parts.length}</span>
        <CaretDown
          aria-hidden
          className="size-14 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <ol className="mt-10 mb-8 ml-7 flex flex-col gap-8 border-l-2 border-border-muted pl-16">
        {groups.map((group) => (
          <li key={group.key} className="flex flex-col gap-6">
            <p
              className={
                group.state === 'active' ? 'text-accent-black' : undefined
              }
            >
              {group.label}
              {group.parts.length > 1 ? ` × ${group.parts.length}` : ''}
            </p>
            {group.parts.map((part) => {
              switch (part.type) {
                case 'tool-searchPlaces':
                case 'tool-computeRoutes':
                case 'tool-lookupWeather':
                case 'tool-resolvePlaces':
                  return (
                    <MapsGroundingSources key={part.toolCallId} part={part} />
                  )
                default:
                  return null
              }
            })}
          </li>
        ))}
      </ol>
    </details>
  )
}

// Same canvas orb and 36px optical size as tw-connect. The label reflects real
// tool state; no invented intermediate steps or raw model reasoning are shown.
export function RunActivityIndicator({
  label = 'Thinking',
  orb = 'working',
}: {
  readonly label?: string
  readonly orb?: OrbState
}) {
  return (
    <output
      aria-live="polite"
      aria-atomic="true"
      className="flex min-h-36 items-center gap-8 text-body-medium text-foreground-muted"
    >
      <ThinkingOrb
        aria-hidden
        size={64}
        state={orb}
        data-orb-state={orb}
        theme="light"
        style={{ width: 36, height: 36 }}
      />
      <span className="thread-activity-label">{label}</span>
    </output>
  )
}
