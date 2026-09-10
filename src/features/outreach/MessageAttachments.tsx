import { ArrowClockwise, Paperclip, SpinnerGap } from '@phosphor-icons/react'
import type { FunctionReturnType } from 'convex/server'
import { useMutation, useQuery } from 'convex/react'

import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

type Attachment = FunctionReturnType<
  typeof api.outreachAttachments.listForMessage
>[number]

/** Subscribe only to the files on this displayed message. */
export function StoredMessageAttachments({
  outreachId,
  messageId,
}: {
  readonly outreachId: Id<'outreachDrafts'>
  readonly messageId: string
}) {
  const attachments = useQuery(api.outreachAttachments.listForMessage, {
    outreachId,
    messageId,
  })
  const retry = useMutation(api.outreachAttachments.retry)
  return (
    <MessageAttachments
      attachments={attachments ?? []}
      onRetry={(id) => void retry({ id }).catch(globalThis.reportError)}
    />
  )
}

function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const chipClassName =
  'inline-flex min-h-32 max-w-full items-center gap-6 rounded-8 border border-border-muted bg-background-lighter px-10 text-label-small text-accent-black'

type MessageAttachmentsProps = {
  readonly attachments: readonly Attachment[]
  /** Ask for another transfer of a failed attachment. */
  readonly onRetry: (id: Id<'outreachAttachments'>) => void
}

export function MessageAttachments({
  attachments,
  onRetry,
}: MessageAttachmentsProps) {
  if (attachments.length === 0) return null
  return (
    <ul aria-label="Attachments" className="mt-12 flex flex-wrap gap-8">
      {attachments.map((attachment) => (
        <li key={attachment.id} className="max-w-full">
          <AttachmentChip attachment={attachment} onRetry={onRetry} />
        </li>
      ))}
    </ul>
  )
}

function AttachmentChip({
  attachment,
  onRetry,
}: {
  readonly attachment: Attachment
  readonly onRetry: MessageAttachmentsProps['onRetry']
}) {
  const meta = [
    formatAttachmentSize(attachment.size),
    attachment.disposition === 'inline' ? 'inline' : null,
  ]
    .filter((part) => part !== null)
    .join(' · ')

  if (attachment.status === 'stored' && attachment.url) {
    return (
      <a
        className={`${chipClassName} transition-colors hover:border-border-loud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100`}
        href={attachment.url}
        rel="noreferrer"
        target="_blank"
      >
        <Paperclip aria-hidden className="shrink-0" size={14} />
        <span className="truncate">{attachment.filename}</span>
        <span className="shrink-0 text-foreground-muted">{meta}</span>
      </a>
    )
  }

  return (
    <span className={chipClassName}>
      {attachment.status === 'pending' ? (
        <SpinnerGap
          aria-hidden
          className="shrink-0 animate-spin text-foreground-muted"
          size={14}
        />
      ) : (
        <Paperclip
          aria-hidden
          className="shrink-0 text-foreground-muted"
          size={14}
        />
      )}
      <span className="truncate">{attachment.filename}</span>
      <span className="shrink-0 text-foreground-muted">
        {meta}
        {attachment.status === 'pending' ? ' · saving' : null}
        {attachment.status === 'skipped' ? ' · too large to save' : null}
        {attachment.status === 'failed' ? ' · not saved' : null}
      </span>
      {attachment.status === 'failed' ? (
        <button
          aria-label={`Retry saving ${attachment.filename}`}
          className="grid size-24 shrink-0 place-items-center rounded-6 text-accent-black hover:bg-background-base focus-visible:outline-2 focus-visible:outline-heat-100"
          type="button"
          onClick={() => onRetry(attachment.id)}
        >
          <ArrowClockwise aria-hidden size={14} />
        </button>
      ) : null}
    </span>
  )
}
