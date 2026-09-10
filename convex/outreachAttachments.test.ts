/// <reference types="vite/client" />

import { register as registerWorkpool } from '@convex-dev/workpool/test'
import agentmailTest from '@agentmail/convex/test'
import { register as registerAgent } from '@convex-dev/agent/test'
import { convexTest } from 'convex-test'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { OUTREACH_ATTACHMENT_MAX_BYTES } from '../shared/foundTools'
import { api, components, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

const INBOX_ID = 'found-d@agentmail.to'
const AGENTMAIL_THREAD_ID = 'thread-1'
const MESSAGE_ID = '<reply-1@example.com>'
const DOWNLOAD_URL = 'https://cdn.example.test/attachment'
const FILE_BYTES = Uint8Array.from([0x25, 0x50, 0x44, 0x46])

const pdfAttachment = {
  attachment_id: 'att-pdf',
  filename: 'PZV_ulm.pdf',
  size: FILE_BYTES.byteLength,
  content_type: 'application/pdf',
}

const inlineImage = {
  attachment_id: 'att-image',
  filename: 'image001.jpg',
  size: FILE_BYTES.byteLength,
  content_type: 'image/jpeg',
  content_id: '<image001.jpg@01DD3F7E.A474F360>',
}

type App = ReturnType<typeof createApp>

function createApp() {
  const t = convexTest(schema, modules)
  registerAgent(t)
  registerWorkpool(t, 'attachmentTransfers')
  t.registerComponent('agentmail', agentmailTest.schema, agentmailTest.modules)
  return t
}

async function setup() {
  vi.stubEnv('AGENTMAIL_API_KEY', 'test-key')
  vi.stubEnv('AGENTMAIL_INBOX_ID', INBOX_ID)
  const t = createApp()
  const userId = await t.run(
    async (ctx) => await ctx.db.insert('users', { displayName: 'Owner' }),
  )
  const otherId = await t.run(
    async (ctx) => await ctx.db.insert('users', { displayName: 'Other' }),
  )
  const thread = await t.mutation(components.agent.threads.createThread, {
    userId,
  })
  const draftId = await t.mutation(internal.outreachDrafts.createFromAgent, {
    userId,
    threadId: thread._id,
    toolCallId: 'draft-call',
    candidateTitle: 'Studierendenwerk Ulm',
    recipient: 'wohnen@studierendenwerk-ulm.de',
    subject: 'Availability',
    body: 'Hello,\n\nIs a room available from November?',
  })
  await t.run(async (ctx) => {
    await ctx.db.patch('outreachDrafts', draftId, {
      state: 'sent',
      agentmailThreadId: AGENTMAIL_THREAD_ID,
      agentmailMessageId: '<sent-1@agentmail.to>',
    })
  })
  return {
    t,
    draftId,
    threadId: thread._id,
    owner: t.withIdentity({ subject: userId }),
    other: t.withIdentity({ subject: otherId }),
  }
}

type AgentMailJson = Record<string, string | number | readonly unknown[]>

function jsonResponse(body: AgentMailJson, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

type AgentMailStub = {
  describeAttachment: (url: string, init: RequestInit | undefined) => Response
  download: () => Response
  thread: () => Response
}

// Stands in for AgentMail's API and its download CDN. Tests override one
// route at a time to shape a scenario.
function stubAgentMail(overrides: Partial<AgentMailStub> = {}) {
  const stub: AgentMailStub = {
    describeAttachment: () =>
      jsonResponse({
        attachment_id: pdfAttachment.attachment_id,
        size: FILE_BYTES.byteLength,
        download_url: DOWNLOAD_URL,
        expires_at: '2026-09-10T09:00:00.000Z',
      }),
    download: () =>
      new Response(FILE_BYTES, {
        headers: { 'content-type': 'application/pdf' },
      }),
    thread: () => jsonResponse({ messages: [] }),
    ...overrides,
  }
  const calls: { url: string; init: RequestInit | undefined }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        input instanceof Request ? input.url : new URL(input).toString()
      calls.push({ url, init })
      if (url.includes('/attachments/')) {
        return Promise.resolve(stub.describeAttachment(url, init))
      }
      if (url.includes('/threads/')) return Promise.resolve(stub.thread())
      return Promise.resolve(stub.download())
    }),
  )
  return { calls, stub }
}

async function receiveReply(
  t: App,
  attachments: readonly unknown[],
  eventId = 'event-1',
) {
  await t.mutation(internal.outreachDelivery.onMessageReceived, {
    eventId,
    message: {
      inbox_id: INBOX_ID,
      message_id: MESSAGE_ID,
      thread_id: AGENTMAIL_THREAD_ID,
      attachments,
    },
    thread: {},
  })
}

async function runTransfers(t: App) {
  vi.useFakeTimers()
  try {
    await t.finishAllScheduledFunctions(vi.runAllTimers)
  } finally {
    vi.useRealTimers()
  }
}

async function attachmentRows(t: App, draftId: Id<'outreachDrafts'>) {
  return await t.run(
    async (ctx) =>
      await ctx.db
        .query('outreachAttachments')
        .withIndex('by_outreach_and_message', (index) =>
          index.eq('outreachId', draftId),
        )
        .take(10),
  )
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('outreach attachments', () => {
  test('keeps recent attachments accessible after 200 older files', async () => {
    const { t, draftId, owner } = await setup()
    await t.run(async (ctx) => {
      const draft = await ctx.db.get('outreachDrafts', draftId)
      if (!draft) throw new Error('Draft missing')
      for (let index = 0; index < 201; index += 1) {
        await ctx.db.insert('outreachAttachments', {
          userId: draft.userId,
          outreachId: draftId,
          inboxId: INBOX_ID,
          messageId: index === 200 ? MESSAGE_ID : `old-${index}`,
          attachmentId: `attachment-${index}`,
          size: OUTREACH_ATTACHMENT_MAX_BYTES + 1,
          disposition: 'attachment',
          transfer: { status: 'skipped', reason: 'too_large' },
        })
      }
    })
    const listed = await owner.query(api.outreachAttachments.listForMessage, {
      outreachId: draftId,
      messageId: MESSAGE_ID,
    })
    expect(listed.map((item) => item.attachmentId)).toEqual(['attachment-200'])
  })

  test('makes an interrupted transfer retryable and ignores an older completion', async () => {
    stubAgentMail()
    const { t, draftId, owner } = await setup()
    await receiveReply(t, [pdfAttachment])
    const [pending] = await attachmentRows(t, draftId)
    if (!pending?.transferWorkId) throw new Error('Transfer work missing')
    await t.mutation(internal.outreachAttachmentTransfers.begin, {
      id: pending._id,
    })

    // Workpool reports an ungraceful failure through this boundary even when
    // the action never reaches a catch or settlement mutation.
    const completion = {
      workId: pending.transferWorkId,
      context: { id: pending._id },
      result: { kind: 'failed' as const, error: 'Action timed out' },
    }
    await t.mutation(internal.outreachAttachmentTransfers.completed, completion)
    await expect(attachmentRows(t, draftId)).resolves.toMatchObject([
      {
        transfer: { status: 'failed', reason: 'Action timed out', attempt: 1 },
      },
    ])

    await owner.mutation(api.outreachAttachments.retry, { id: pending._id })
    await t.mutation(internal.outreachAttachmentTransfers.completed, completion)
    await expect(attachmentRows(t, draftId)).resolves.toMatchObject([
      { transfer: { status: 'pending', attempt: 0 } },
    ])
    await runTransfers(t)
    await expect(attachmentRows(t, draftId)).resolves.toMatchObject([
      { transfer: { status: 'stored' } },
    ])
  })

  test('exhausts transient retries and leaves the attachment retryable', async () => {
    const { calls } = stubAgentMail({
      describeAttachment: () => jsonResponse({ message: 'unavailable' }, 503),
    })
    const { t, draftId } = await setup()
    await receiveReply(t, [pdfAttachment])
    await runTransfers(t)
    expect(calls).toHaveLength(4)
    await expect(attachmentRows(t, draftId)).resolves.toMatchObject([
      { transfer: { status: 'failed', attempt: 4 } },
    ])
  })

  test('preserves the stored file when a successful transfer settles twice', async () => {
    stubAgentMail()
    const { t, draftId } = await setup()
    await receiveReply(t, [pdfAttachment])
    await runTransfers(t)
    const [stored] = await attachmentRows(t, draftId)
    if (stored?.transfer.status !== 'stored')
      throw new Error('Attachment not stored')
    const transfer = stored.transfer
    await t.mutation(internal.outreachAttachmentTransfers.settle, {
      id: stored._id,
      transfer,
    })
    const size = await t.run(
      async (ctx) => (await ctx.storage.get(transfer.storageId))?.size,
    )
    expect(size).toBe(FILE_BYTES.byteLength)
  })

  test('captures reply attachments into storage and serves them from the inbox', async () => {
    const { calls } = stubAgentMail()
    const { t, draftId, owner, other } = await setup()

    await receiveReply(t, [pdfAttachment, inlineImage])
    await expect(
      owner.query(api.outreachAttachments.listForMessage, {
        outreachId: draftId,
        messageId: MESSAGE_ID,
      }),
    ).resolves.toMatchObject([
      { attachmentId: 'att-pdf', status: 'pending', url: null },
      { attachmentId: 'att-image', status: 'pending', url: null },
    ])

    await runTransfers(t)

    const listed = await owner.query(api.outreachAttachments.listForMessage, {
      outreachId: draftId,
      messageId: MESSAGE_ID,
    })
    expect(listed).toMatchObject([
      {
        messageId: MESSAGE_ID,
        attachmentId: 'att-pdf',
        filename: 'PZV_ulm.pdf',
        contentType: 'application/pdf',
        size: FILE_BYTES.byteLength,
        disposition: 'attachment',
        status: 'stored',
      },
      {
        attachmentId: 'att-image',
        filename: 'image001.jpg',
        disposition: 'inline',
        status: 'stored',
      },
    ])
    expect(listed.map((item) => item.url)).toEqual([
      expect.stringContaining('/'),
      expect.stringContaining('/'),
    ])

    const rows = await attachmentRows(t, draftId)
    const stored = rows[0]?.transfer
    if (stored?.status !== 'stored') throw new Error('Attachment not stored')
    const storedBytes = await t.run(async (ctx) => {
      const blob = await ctx.storage.get(stored.storageId)
      return blob ? (await blob.arrayBuffer()).byteLength : null
    })
    expect(storedBytes).toBe(FILE_BYTES.byteLength)

    const describeCall = calls.find((call) =>
      call.url.includes('/attachments/'),
    )
    expect(describeCall?.url).toBe(
      `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(INBOX_ID)}/messages/${encodeURIComponent(MESSAGE_ID)}/attachments/att-pdf`,
    )
    expect(describeCall?.init?.headers).toMatchObject({
      Authorization: 'Bearer test-key',
    })

    // A redelivered webhook records nothing twice.
    await receiveReply(t, [pdfAttachment, inlineImage], 'event-2')
    await expect(attachmentRows(t, draftId)).resolves.toHaveLength(2)

    await expect(
      other.query(api.outreachAttachments.listForMessage, {
        outreachId: draftId,
        messageId: MESSAGE_ID,
      }),
    ).rejects.toMatchObject({ data: { code: 'OUTREACH_DRAFT_NOT_FOUND' } })
  })

  test('skips an oversized attachment without contacting AgentMail', async () => {
    const { calls } = stubAgentMail()
    const { t, draftId, owner } = await setup()

    await receiveReply(t, [
      { ...pdfAttachment, size: OUTREACH_ATTACHMENT_MAX_BYTES + 1 },
    ])
    await runTransfers(t)

    await expect(
      owner.query(api.outreachAttachments.listForMessage, {
        outreachId: draftId,
        messageId: MESSAGE_ID,
      }),
    ).resolves.toMatchObject([{ status: 'skipped', url: null }])
    expect(calls).toHaveLength(0)
  })

  test('marks a permanent AgentMail error failed and transfers again on request', async () => {
    const { calls, stub } = stubAgentMail({
      describeAttachment: () => jsonResponse({ message: 'not found' }, 404),
    })
    const { t, draftId, owner, other } = await setup()

    await receiveReply(t, [pdfAttachment])
    await runTransfers(t)

    const [failed] = await attachmentRows(t, draftId)
    expect(failed?.transfer).toEqual({
      status: 'failed',
      reason: 'AgentMail responded 404',
      attempt: 1,
    })
    expect(calls).toHaveLength(1)
    if (!failed) throw new Error('Attachment row missing')

    await expect(
      other.mutation(api.outreachAttachments.retry, { id: failed._id }),
    ).rejects.toMatchObject({ data: { code: 'OUTREACH_DRAFT_NOT_FOUND' } })

    stub.describeAttachment = () =>
      jsonResponse({
        attachment_id: pdfAttachment.attachment_id,
        size: FILE_BYTES.byteLength,
        download_url: DOWNLOAD_URL,
        expires_at: '2026-09-10T09:00:00.000Z',
      })
    await owner.mutation(api.outreachAttachments.retry, { id: failed._id })
    await runTransfers(t)

    await expect(attachmentRows(t, draftId)).resolves.toMatchObject([
      { transfer: { status: 'stored' } },
    ])
  })

  test('retries a transient failure before storing the bytes', async () => {
    let describeCalls = 0
    stubAgentMail({
      describeAttachment: () => {
        describeCalls += 1
        return describeCalls < 3
          ? jsonResponse({ message: 'bad gateway' }, 502)
          : jsonResponse({
              attachment_id: pdfAttachment.attachment_id,
              size: FILE_BYTES.byteLength,
              download_url: DOWNLOAD_URL,
              expires_at: '2026-09-10T09:00:00.000Z',
            })
      },
    })
    const { t, draftId } = await setup()

    await receiveReply(t, [pdfAttachment])
    await runTransfers(t)

    expect(describeCalls).toBe(3)
    await expect(attachmentRows(t, draftId)).resolves.toMatchObject([
      { transfer: { status: 'stored' } },
    ])
  })

  test('ignores a malformed attachment entry without hiding the reply', async () => {
    stubAgentMail()
    const { t, draftId } = await setup()

    await receiveReply(t, [{ attachment_id: 42 }, pdfAttachment])

    await expect(
      t.run(async (ctx) => await ctx.db.get('outreachDrafts', draftId)),
    ).resolves.toMatchObject({ state: 'replied', replyRevision: 1 })
    await expect(attachmentRows(t, draftId)).resolves.toMatchObject([
      { attachmentId: 'att-pdf', transfer: { status: 'pending', attempt: 0 } },
    ])
  })

  test('records attachments seen while reading the thread', async () => {
    stubAgentMail({
      thread: () =>
        jsonResponse({
          messages: [
            {
              message_id: MESSAGE_ID,
              timestamp: '2026-09-08T09:41:45.000Z',
              from: 'Dragana Bass <dragana.bass@studierendenwerk-ulm.de>',
              to: [INBOX_ID],
              text: 'Please see the attached list.',
              attachments: [pdfAttachment, { attachment_id: 42 }],
            },
          ],
        }),
    })
    const { t, draftId, threadId, owner } = await setup()

    const thread = await owner.action(api.outreachInbox.read, {
      threadId,
      outreachId: draftId,
    })
    expect(thread.messages).toMatchObject([
      {
        direction: 'inbound',
        attachments: [
          {
            attachmentId: 'att-pdf',
            filename: 'PZV_ulm.pdf',
            contentType: 'application/pdf',
            size: FILE_BYTES.byteLength,
            disposition: 'attachment',
          },
        ],
      },
    ])

    await runTransfers(t)
    await expect(
      owner.query(api.outreachAttachments.listForMessage, {
        outreachId: draftId,
        messageId: MESSAGE_ID,
      }),
    ).resolves.toMatchObject([
      { messageId: MESSAGE_ID, attachmentId: 'att-pdf', status: 'stored' },
    ])
  })
})
