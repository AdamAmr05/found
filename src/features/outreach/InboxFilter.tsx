import type { InboxItem } from './InboxRow'

/** The states a user filters by; the transient ones appear only under All. */
export type InboxStateFilter = 'all' | 'replied' | 'sent' | 'draft' | 'failed'

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'replied', label: 'Replied' },
  { value: 'sent', label: 'Sent' },
  { value: 'draft', label: 'Drafts' },
  { value: 'failed', label: 'Failed' },
] as const satisfies readonly { value: InboxStateFilter; label: string }[]

export function inboxFilterLabel(filter: InboxStateFilter): string {
  return OPTIONS.find((option) => option.value === filter)?.label ?? 'All'
}

/** The query argument for a filter; All narrows nothing. */
export function inboxFilterState(
  filter: InboxStateFilter,
): InboxItem['state'] | undefined {
  return filter === 'all' ? undefined : filter
}

type InboxFilterProps = {
  readonly value: InboxStateFilter
  readonly onChange: (value: InboxStateFilter) => void
}

export function InboxFilter({ value, onChange }: InboxFilterProps) {
  return (
    <fieldset className="flex flex-wrap gap-4">
      <legend className="sr-only">Filter by state</legend>
      {OPTIONS.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            aria-pressed={selected}
            className={`min-h-32 rounded-8 px-10 text-label-small transition-colors hover:bg-background-lighter focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 ${
              selected
                ? 'bg-background-lighter text-accent-black'
                : 'text-foreground-muted hover:text-accent-black'
            }`}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </fieldset>
  )
}
