import type { FunctionReturnType } from 'convex/server'

import type { api } from '../../../convex/_generated/api'

export type InboxItem = FunctionReturnType<
  typeof api.outreachInbox.list
>['page'][number]

type OutreachState = InboxItem['state']

// Copy and tone per delivery state: a plain word, colored only when the
// conversation needs attention or something went wrong.
const STATE_PRESENTATION = {
  draft: { label: 'Draft', className: 'text-foreground-muted' },
  approved: { label: 'Approved', className: 'text-foreground-muted' },
  queued: { label: 'Sending', className: 'text-foreground-muted' },
  sent: { label: 'Sent', className: 'text-foreground-muted' },
  replied: { label: 'Replied', className: 'text-heat-100' },
  failed: { label: 'Failed', className: 'text-accent-crimson' },
  uncertain: { label: 'Unconfirmed', className: 'text-accent-black' },
} satisfies Record<
  OutreachState,
  { readonly label: string; readonly className: string }
>

function OutreachStateLabel({ state }: { readonly state: OutreachState }) {
  const presentation = STATE_PRESENTATION[state]
  return (
    <span
      className={`shrink-0 text-label-small whitespace-nowrap ${presentation.className}`}
    >
      {presentation.label}
    </span>
  )
}

function activityLabel(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)
}

type InboxRowProps = {
  readonly item: InboxItem
  readonly onOpen: () => void
}

/**
 * One conversation in Inbox. Three tiers: the place, then the email subject,
 * then the address and time as monospace metadata.
 */
export function InboxRow({ item, onOpen }: InboxRowProps) {
  return (
    <button
      aria-label={`Open outreach to ${item.candidateTitle}: ${item.subject || 'No subject'}`}
      className="surface-paper surface-paper-interactive w-full rounded-16 px-18 py-14 text-left focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 disabled:cursor-default"
      disabled={!item.canReadThread}
      type="button"
      onClick={onOpen}
    >
      <span className="flex items-center gap-12">
        <span className="flex min-w-0 flex-1 items-center gap-8">
          {item.unreadReplyCount > 0 ? (
            <span
              aria-label={`${item.unreadReplyCount} unread replies`}
              className="size-7 shrink-0 rounded-full bg-heat-100"
            />
          ) : null}
          <span className="truncate text-label-large text-accent-black">
            {item.candidateTitle}
          </span>
        </span>
        <OutreachStateLabel state={item.state} />
      </span>
      <span className="mt-4 block truncate text-body-medium text-accent-black">
        {item.subject || 'No subject'}
      </span>
      <span className="mt-6 flex items-center gap-12 font-mono text-mono-x-small text-foreground-muted">
        <span className="min-w-0 flex-1 truncate">
          {item.recipient || (item.state === 'draft' ? '' : 'No recipient')}
        </span>
        <time className="shrink-0 tabular-nums">
          {activityLabel(item.latestActivityAt)}
        </time>
      </span>
    </button>
  )
}
