import {
  NonRetryableError,
  Workpool,
  vOnCompleteArgs,
} from '@convex-dev/workpool'
import { type Infer, v } from 'convex/values'
import { z } from 'zod'

import { OUTREACH_ATTACHMENT_MAX_BYTES } from '../shared/foundTools'
import { components, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import {
  env,
  internalAction,
  internalMutation,
  type MutationCtx,
} from './_generated/server'
import { vOutreachAttachmentTransfer } from './outreachModel'

const FAILURE_REASON_MAX_LENGTH = 200
const PERMANENT_HTTP_STATUSES = new Set([400, 401, 403, 404, 410, 422])
const pool = new Workpool(components.attachmentTransfers, {
  maxParallelism: 3,
  retryActionsByDefault: true,
  defaultRetryBehavior: { maxAttempts: 4, initialBackoffMs: 30_000, base: 2 },
})

export async function enqueueTransfer(
  ctx: MutationCtx,
  id: Id<'outreachAttachments'>,
): Promise<void> {
  const workId = await pool.enqueueAction(
    ctx,
    internal.outreachAttachmentTransfers.transfer,
    { id },
    {
      onComplete: internal.outreachAttachmentTransfers.completed,
      context: { id },
    },
  )
  await ctx.db.patch('outreachAttachments', id, { transferWorkId: workId })
}

const vTransferTarget = v.object({
  inboxId: v.string(),
  messageId: v.string(),
  attachmentId: v.string(),
})
type TransferTarget = Infer<typeof vTransferTarget>

// Count attempts before external work, including attempts interrupted by the runtime.
export const begin = internalMutation({
  args: { id: v.id('outreachAttachments') },
  returns: v.union(v.null(), vTransferTarget),
  handler: async (ctx, { id }) => {
    const row = await ctx.db.get('outreachAttachments', id)
    if (!row || row.transfer.status !== 'pending') return null
    await ctx.db.patch('outreachAttachments', id, {
      transfer: { status: 'pending', attempt: row.transfer.attempt + 1 },
    })
    return {
      inboxId: row.inboxId,
      messageId: row.messageId,
      attachmentId: row.attachmentId,
    }
  },
})

const downloadSchema = z.object({
  download_url: z.string().url(),
  size: z.number().int().nonnegative(),
})

async function downloadAttachment(
  target: TransferTarget,
): Promise<Blob | null> {
  const apiKey = env.AGENTMAIL_API_KEY
  if (!apiKey) throw new NonRetryableError('AgentMail is not configured')
  const baseUrl = (
    env.AGENTMAIL_BASE_URL ?? 'https://api.agentmail.to/v0'
  ).replace(/\/$/u, '')
  const inbox = encodeURIComponent(target.inboxId)
  const message = encodeURIComponent(target.messageId)
  const attachment = encodeURIComponent(target.attachmentId)
  const described = await fetch(
    `${baseUrl}/inboxes/${inbox}/messages/${message}/attachments/${attachment}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30_000),
    },
  )
  if (!described.ok) {
    const reason = `AgentMail responded ${described.status}`
    if (PERMANENT_HTTP_STATUSES.has(described.status))
      throw new NonRetryableError(reason)
    throw new Error(reason)
  }
  const download = downloadSchema.safeParse(await described.json())
  if (!download.success)
    throw new NonRetryableError(
      'AgentMail described the attachment in an unexpected shape',
    )
  if (download.data.size > OUTREACH_ATTACHMENT_MAX_BYTES) return null
  const response = await fetch(download.data.download_url, {
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok)
    throw new Error(`Attachment download responded ${response.status}`)
  const blob = await response.blob()
  return blob.size > OUTREACH_ATTACHMENT_MAX_BYTES ? null : blob
}

export const transfer = internalAction({
  args: { id: v.id('outreachAttachments') },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const target: TransferTarget | null = await ctx.runMutation(
      internal.outreachAttachmentTransfers.begin,
      { id },
    )
    if (!target) return null
    // Let failures escape: Workpool owns retries and recovery after runtime interruption.
    const blob = await downloadAttachment(target)
    const transfer: Infer<typeof vOutreachAttachmentTransfer> = blob
      ? {
          status: 'stored',
          storageId: await ctx.storage.store(blob),
          storedAt: Date.now(),
        }
      : { status: 'skipped', reason: 'too_large' }
    await ctx.runMutation(internal.outreachAttachmentTransfers.settle, {
      id,
      transfer,
    })
    return null
  },
})

export const settle = internalMutation({
  args: {
    id: v.id('outreachAttachments'),
    transfer: vOutreachAttachmentTransfer,
  },
  returns: v.null(),
  handler: async (ctx, { id, transfer }) => {
    const row = await ctx.db.get('outreachAttachments', id)
    if (!row || row.transfer.status !== 'pending') {
      // A repeated successful settlement must never delete the canonical blob.
      if (
        transfer.status === 'stored' &&
        (row?.transfer.status !== 'stored' ||
          row.transfer.storageId !== transfer.storageId)
      ) {
        await ctx.storage.delete(transfer.storageId)
      }
      return null
    }
    await ctx.db.patch('outreachAttachments', id, { transfer })
    return null
  },
})

export const completed = internalMutation({
  args: vOnCompleteArgs(
    v.object({ id: v.id('outreachAttachments') }),
    v.null(),
  ),
  returns: v.null(),
  handler: async (ctx, { workId, context, result }) => {
    const row = await ctx.db.get('outreachAttachments', context.id)
    if (
      !row ||
      row.transferWorkId !== workId ||
      row.transfer.status !== 'pending'
    )
      return null
    const reason =
      result.kind === 'failed'
        ? result.error
        : 'Attachment transfer did not complete'
    await ctx.db.patch('outreachAttachments', row._id, {
      transfer: {
        status: 'failed',
        reason: reason.slice(0, FAILURE_REASON_MAX_LENGTH),
        attempt: row.transfer.attempt,
      },
    })
    return null
  },
})
