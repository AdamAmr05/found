/// <reference types="vite/client" />

import { register as registerAgent } from '@convex-dev/agent/test'
import { convexTest } from 'convex-test'
import type { SessionId } from 'convex-helpers/server/sessions'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { api, components, internal } from './_generated/api'
import schema from './schema'
import { OUTREACH_BODY_MAX_LENGTH } from '../shared/foundTools'

const modules = import.meta.glob('./**/*.ts')
// SAFETY: SessionId is a nominal brand over strings; this fixed value models
// the owning browser session at the public function boundary.
const ownerSession = 'outreach-owner' as SessionId
// SAFETY: This distinct branded fixture models a different browser session.
const otherSession = 'outreach-other' as SessionId

function setup() {
  const t = convexTest(schema, modules)
  registerAgent(t)
  return t
}

async function createDraft(t: ReturnType<typeof setup>) {
  const thread = await t.mutation(components.agent.threads.createThread, {
    userId: ownerSession,
  })
  const draftId = await t.mutation(internal.outreachDrafts.createFromAgent, {
    sessionId: ownerSession,
    threadId: thread._id,
    toolCallId: 'draft-call',
    candidateTitle: 'Apartment A',
    recipient: 'HOST@EXAMPLE.COM ',
    subject: ' Availability ',
    body: 'Hello,\n\nIs this still available?',
  })
  return { draftId, threadId: thread._id }
}

afterEach(() => vi.unstubAllEnvs())

describe('outreach drafts', () => {
  test('normalizes the agent draft and protects it from another session', async () => {
    const t = setup()
    const { draftId } = await createDraft(t)

    await expect(
      t.query(api.outreachDrafts.get, {
        draftId,
        sessionId: otherSession,
      }),
    ).resolves.toBeNull()
    await expect(
      t.query(api.outreachDrafts.get, {
        draftId,
        sessionId: ownerSession,
      }),
    ).resolves.toMatchObject({
      recipient: 'host@example.com',
      subject: 'Availability',
      revision: 1,
      state: 'draft',
    })
  })

  test('manual edits advance the revision and invalidate approval', async () => {
    vi.stubEnv('AGENTMAIL_INBOX_ID', 'found-d@agentmail.to')
    const t = setup()
    const { draftId } = await createDraft(t)

    await t.mutation(api.outreachDrafts.approve, {
      draftId,
      sessionId: ownerSession,
    })
    await expect(
      t.mutation(api.outreachDelivery.send, {
        draftId,
        sessionId: otherSession,
      }),
    ).rejects.toMatchObject({ data: { code: 'OUTREACH_DRAFT_NOT_FOUND' } })

    await t.mutation(api.outreachDrafts.update, {
      draftId,
      sessionId: ownerSession,
      recipient: 'host@example.com',
      subject: 'Availability this autumn',
      body: 'Hello,\n\nIs this still available?',
    })
    await expect(
      t.query(api.outreachDrafts.get, {
        draftId,
        sessionId: ownerSession,
      }),
    ).resolves.toMatchObject({ revision: 2, state: 'draft' })
    await expect(
      t.mutation(api.outreachDelivery.send, {
        draftId,
        sessionId: ownerSession,
      }),
    ).rejects.toMatchObject({ data: { code: 'OUTREACH_APPROVAL_REQUIRED' } })
  })

  test('keeps AI revisions pending until the user accepts them', async () => {
    const t = setup()
    const { draftId } = await createDraft(t)

    await t.mutation(internal.outreachDrafts.setProposal, {
      draftId,
      sessionId: ownerSession,
      baseRevision: 1,
      instruction: 'Make it warmer',
      recipient: 'host@example.com',
      subject: 'Availability',
      body: 'Hi,\n\nI hope you are well. Is this still available?',
    })
    const pending = await t.query(api.outreachDrafts.get, {
      draftId,
      sessionId: ownerSession,
    })
    expect(pending).toMatchObject({
      body: 'Hello,\n\nIs this still available?',
      revision: 1,
      proposal: { instruction: 'Make it warmer' },
    })

    await t.mutation(api.outreachDrafts.acceptProposal, {
      draftId,
      sessionId: ownerSession,
    })
    await expect(
      t.query(api.outreachDrafts.get, {
        draftId,
        sessionId: ownerSession,
      }),
    ).resolves.toMatchObject({
      body: 'Hi,\n\nI hope you are well. Is this still available?',
      revision: 2,
      state: 'draft',
    })
  })

  test('enforces the email body boundary for agent and manual edits', async () => {
    const t = setup()
    const { draftId, threadId } = await createDraft(t)
    const maximumBody = 'x'.repeat(OUTREACH_BODY_MAX_LENGTH)
    const oversizedBody = `${maximumBody}x`

    await expect(
      t.mutation(api.outreachDrafts.update, {
        draftId,
        sessionId: ownerSession,
        recipient: 'host@example.com',
        subject: 'Availability',
        body: maximumBody,
      }),
    ).resolves.toBe(2)
    await expect(
      t.mutation(api.outreachDrafts.update, {
        draftId,
        sessionId: ownerSession,
        recipient: 'host@example.com',
        subject: 'Availability',
        body: oversizedBody,
      }),
    ).rejects.toMatchObject({ data: { code: 'OUTREACH_BODY_TOO_LONG' } })
    await expect(
      t.mutation(internal.outreachDrafts.createFromAgent, {
        sessionId: ownerSession,
        threadId,
        toolCallId: 'oversized-draft-call',
        candidateTitle: 'Apartment B',
        subject: 'Availability',
        body: oversizedBody,
      }),
    ).rejects.toMatchObject({ data: { code: 'OUTREACH_BODY_TOO_LONG' } })
    await expect(
      t.mutation(internal.outreachDrafts.setProposal, {
        draftId,
        sessionId: ownerSession,
        baseRevision: 2,
        instruction: 'Make it warmer',
        recipient: 'host@example.com',
        subject: 'Availability',
        body: oversizedBody,
      }),
    ).rejects.toMatchObject({ data: { code: 'OUTREACH_BODY_TOO_LONG' } })
  })

  test('rejects AI revisions for locked drafts before model work', async () => {
    const t = setup()
    const { draftId } = await createDraft(t)
    await t.run(async (ctx) => {
      await ctx.db.patch('outreachDrafts', draftId, { state: 'sent' })
    })

    await expect(
      t.action(api.outreachRevision.request, {
        draftId,
        sessionId: ownerSession,
        instruction: 'Make it warmer',
      }),
    ).rejects.toMatchObject({
      data: { code: 'OUTREACH_DRAFT_NOT_EDITABLE' },
    })
  })

  test('ignores delivery reconciliation from a superseded send attempt', async () => {
    const t = setup()
    const { draftId } = await createDraft(t)
    await t.run(async (ctx) => {
      await ctx.db.patch('outreachDrafts', draftId, {
        outboundId: 'outbound-current',
        state: 'queued',
      })
    })

    await t.mutation(internal.outreachDelivery.applyOutboundStatus, {
      draftId,
      outboundId: 'outbound-old',
      attempt: 0,
      status: 'sent',
      agentmailMessageId: 'message-old',
      threadId: 'thread-old',
      errorMessage: null,
    })

    await expect(
      t.run(async (ctx) => await ctx.db.get('outreachDrafts', draftId)),
    ).resolves.toMatchObject({
      outboundId: 'outbound-current',
      state: 'queued',
    })
  })

  test('does not move replied or failed drafts backward on late events', async () => {
    const t = setup()
    const { draftId } = await createDraft(t)
    await t.run(async (ctx) => {
      await ctx.db.patch('outreachDrafts', draftId, {
        agentmailMessageId: 'message-current',
        outboundId: 'outbound-current',
        state: 'replied',
      })
    })

    await t.mutation(internal.outreachDelivery.onEvent, {
      event: {
        type: 'event',
        event_type: 'message.sent',
        event_id: 'late-sent',
        send: { message_id: 'message-current', thread_id: 'thread-current' },
      },
    })
    await expect(
      t.run(async (ctx) => await ctx.db.get('outreachDrafts', draftId)),
    ).resolves.toMatchObject({ state: 'replied' })

    await t.run(async (ctx) => {
      await ctx.db.patch('outreachDrafts', draftId, { state: 'failed' })
    })
    await t.mutation(internal.outreachDelivery.onEvent, {
      event: {
        type: 'event',
        event_type: 'message.delivered',
        event_id: 'late-delivered',
        delivery: {
          message_id: 'message-current',
          thread_id: 'thread-current',
        },
      },
    })
    await expect(
      t.run(async (ctx) => await ctx.db.get('outreachDrafts', draftId)),
    ).resolves.toMatchObject({ state: 'failed' })
  })

  test('tracks agent-seen and human-read replies independently', async () => {
    const t = setup()
    const { draftId } = await createDraft(t)
    await t.run(async (ctx) => {
      await ctx.db.patch('outreachDrafts', draftId, {
        agentHasUnreadReply: true,
        unreadReplyCount: 2,
      })
    })

    await t.mutation(internal.outreachMailbox.markReadForAgent, {
      outreachId: draftId,
      sessionId: ownerSession,
    })
    await expect(
      t.run(async (ctx) => await ctx.db.get('outreachDrafts', draftId)),
    ).resolves.toMatchObject({
      agentHasUnreadReply: false,
      unreadReplyCount: 2,
    })

    await t.mutation(api.outreachInbox.markRead, {
      outreachId: draftId,
      sessionId: ownerSession,
    })
    await expect(
      t.run(async (ctx) => await ctx.db.get('outreachDrafts', draftId)),
    ).resolves.toMatchObject({
      agentHasUnreadReply: false,
      unreadReplyCount: 0,
    })
  })
})
