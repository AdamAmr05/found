/// <reference types="vite/client" />

import {
  type OutboundId,
  type OutboundStatus,
  vOutboundStatus,
} from '@agentmail/convex'
import agentmailTest from '@agentmail/convex/test'
import { register as registerAgent } from '@convex-dev/agent/test'
import {
  componentsGeneric,
  type FunctionReference,
  mutationGeneric,
} from 'convex/server'
import { convexTest } from 'convex-test'
import { v } from 'convex/values'
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

type AgentmailOutboundStatusFields = {
  status: OutboundStatus
  agentmailMessageId?: string
  threadId?: string
}

const setAgentmailOutboundStatus = mutationGeneric({
  args: {
    outboundId: v.optional(v.id('outboundMessages')),
    status: vOutboundStatus,
    agentmailMessageId: v.optional(v.string()),
    threadId: v.optional(v.string()),
  },
  returns: v.id('outboundMessages'),
  handler: async (ctx, args) => {
    const statusFields: AgentmailOutboundStatusFields = { status: args.status }
    if (args.agentmailMessageId) {
      statusFields.agentmailMessageId = args.agentmailMessageId
    }
    if (args.threadId) statusFields.threadId = args.threadId
    if (args.outboundId) {
      await ctx.db.patch('outboundMessages', args.outboundId, statusFields)
      return args.outboundId
    }
    return await ctx.db.insert('outboundMessages', {
      inboxId: 'found-d@agentmail.to',
      kind: 'send',
      payload: {},
      ...statusFields,
    })
  },
})

const agentmailModules = {
  ...agentmailTest.modules,
  './component/testFixtures.ts': async () => ({
    setOutboundStatus: setAgentmailOutboundStatus,
  }),
}

function requiredTestReference<Reference>(
  reference: Reference | undefined,
): Reference {
  if (!reference) throw new Error('AgentMail test reference is unavailable')
  return reference
}

const agentmailTestComponents = componentsGeneric()
const setAgentmailOutboundStatusReference: FunctionReference<
  'mutation',
  'public',
  {
    outboundId?: OutboundId
    status: OutboundStatus
    agentmailMessageId?: string
    threadId?: string
  },
  OutboundId
> = requiredTestReference(
  agentmailTestComponents.agentmail?.testFixtures?.setOutboundStatus,
)

function setup() {
  const t = convexTest(schema, modules)
  registerAgent(t)
  t.registerComponent('agentmail', agentmailTest.schema, agentmailModules)
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
    const requestId = 'revision-request-1'

    await t.mutation(internal.outreachDrafts.beginRevision, {
      draftId,
      sessionId: ownerSession,
      requestId,
    })

    await t.mutation(internal.outreachDrafts.setProposal, {
      draftId,
      sessionId: ownerSession,
      baseRevision: 1,
      requestId,
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
      t.mutation(internal.outreachDrafts.beginRevision, {
        draftId,
        sessionId: ownerSession,
        requestId: 'oversized-request',
      }),
    ).resolves.toMatchObject({ revision: 2 })
    await expect(
      t.mutation(internal.outreachDrafts.setProposal, {
        draftId,
        sessionId: ownerSession,
        baseRevision: 2,
        requestId: 'oversized-request',
        instruction: 'Make it warmer',
        recipient: 'host@example.com',
        subject: 'Availability',
        body: oversizedBody,
      }),
    ).rejects.toMatchObject({ data: { code: 'OUTREACH_BODY_TOO_LONG' } })
  })

  test('allows only the current AI revision request to publish a proposal', async () => {
    const t = setup()
    const { draftId } = await createDraft(t)

    await t.mutation(internal.outreachDrafts.beginRevision, {
      draftId,
      sessionId: ownerSession,
      requestId: 'request-a',
    })
    await expect(
      t.mutation(internal.outreachDrafts.beginRevision, {
        draftId,
        sessionId: ownerSession,
        requestId: 'request-b',
      }),
    ).rejects.toMatchObject({
      data: { code: 'OUTREACH_REVISION_IN_PROGRESS' },
    })

    await t.mutation(internal.outreachDrafts.clearRevision, {
      draftId,
      sessionId: ownerSession,
      requestId: 'request-a',
    })
    await t.mutation(internal.outreachDrafts.beginRevision, {
      draftId,
      sessionId: ownerSession,
      requestId: 'request-b',
    })
    await expect(
      t.mutation(internal.outreachDrafts.setProposal, {
        draftId,
        sessionId: ownerSession,
        baseRevision: 1,
        requestId: 'request-a',
        instruction: 'Make it shorter',
        recipient: 'host@example.com',
        subject: 'Availability',
        body: 'Still available?',
      }),
    ).resolves.toBe(false)
    await expect(
      t.mutation(internal.outreachDrafts.setProposal, {
        draftId,
        sessionId: ownerSession,
        baseRevision: 1,
        requestId: 'request-b',
        instruction: 'Make it warmer',
        recipient: 'host@example.com',
        subject: 'Availability',
        body: 'Hi, is this still available?',
      }),
    ).resolves.toBe(true)
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

  test('keeps reconciling beyond the old one-minute horizon', async () => {
    const t = setup()
    const { draftId } = await createDraft(t)
    await t.run(async (ctx) => {
      await ctx.db.patch('outreachDrafts', draftId, {
        outboundId: 'outbound-current',
        state: 'queued',
      })
    })

    const scheduledAfter = Date.now() + 299_000
    await t.mutation(internal.outreachDelivery.applyOutboundStatus, {
      draftId,
      outboundId: 'outbound-current',
      attempt: 6,
      status: 'pending',
      agentmailMessageId: null,
      threadId: null,
      errorMessage: null,
    })
    const scheduled = await t.run(
      async (ctx) =>
        await ctx.db.system
          .query('_scheduled_functions')
          .order('desc')
          .take(10),
    )
    const reconciliation = scheduled.find(
      (scheduledFunction) =>
        scheduledFunction.name === 'outreachDelivery:syncOutbound',
    )
    expect(reconciliation?.scheduledTime).toBeGreaterThan(scheduledAfter)
    expect(reconciliation?.state).toEqual({ kind: 'pending' })

    await t.mutation(internal.outreachDelivery.applyOutboundStatus, {
      draftId,
      outboundId: 'outbound-current',
      attempt: 7,
      status: 'sent',
      agentmailMessageId: 'message-current',
      threadId: 'thread-current',
      errorMessage: null,
    })
    await expect(
      t.run(async (ctx) => await ctx.db.get('outreachDrafts', draftId)),
    ).resolves.toMatchObject({
      state: 'sent',
      agentmailMessageId: 'message-current',
      agentmailThreadId: 'thread-current',
    })
  })

  test('stops reconciling after the recovery horizon without claiming failure', async () => {
    const t = setup()
    const { draftId } = await createDraft(t)
    await t.run(async (ctx) => {
      await ctx.db.patch('outreachDrafts', draftId, {
        outboundId: 'outbound-current',
        state: 'queued',
        deliveryStartedAt: Date.now() - 31 * 60 * 1_000,
      })
    })

    await t.mutation(internal.outreachDelivery.applyOutboundStatus, {
      draftId,
      outboundId: 'outbound-current',
      attempt: 12,
      status: 'pending',
      agentmailMessageId: null,
      threadId: null,
      errorMessage: null,
    })

    await expect(
      t.run(async (ctx) => await ctx.db.get('outreachDrafts', draftId)),
    ).resolves.toMatchObject({ state: 'uncertain' })
    const scheduled = await t.run(
      async (ctx) =>
        await ctx.db.system
          .query('_scheduled_functions')
          .order('desc')
          .take(10),
    )
    expect(
      scheduled.some(
        (scheduledFunction) =>
          scheduledFunction.name === 'outreachDelivery:syncOutbound',
      ),
    ).toBe(false)
  })

  test('rechecks uncertain delivery through the real AgentMail component', async () => {
    const t = setup()
    const { draftId } = await createDraft(t)
    const outboundId = await t.mutation(setAgentmailOutboundStatusReference, {
      status: 'pending',
    })
    await t.run(async (ctx) => {
      await ctx.db.patch('outreachDrafts', draftId, {
        outboundId,
        state: 'uncertain',
      })
    })

    await expect(
      t.mutation(api.outreachDelivery.recheck, {
        draftId,
        sessionId: otherSession,
      }),
    ).rejects.toMatchObject({ data: { code: 'OUTREACH_DRAFT_NOT_FOUND' } })
    await expect(
      t.mutation(api.outreachDelivery.recheck, {
        draftId,
        sessionId: ownerSession,
      }),
    ).resolves.toBe('uncertain')

    await t.mutation(setAgentmailOutboundStatusReference, {
      outboundId,
      status: 'sent',
      agentmailMessageId: 'message-current',
      threadId: 'thread-current',
    })
    await expect(
      t.mutation(api.outreachDelivery.recheck, {
        draftId,
        sessionId: ownerSession,
      }),
    ).resolves.toBe('sent')
    await expect(
      t.run(async (ctx) => await ctx.db.get('outreachDrafts', draftId)),
    ).resolves.toMatchObject({
      state: 'sent',
      agentmailMessageId: 'message-current',
      agentmailThreadId: 'thread-current',
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

  test('marks only the reply revision observed by the human and agent', async () => {
    const t = setup()
    const { draftId, threadId } = await createDraft(t)
    await t.run(async (ctx) => {
      await ctx.db.patch('outreachDrafts', draftId, {
        agentmailThreadId: 'thread-current',
        replyRevision: 1,
        humanReadThroughReplyRevision: 0,
        agentReadThroughReplyRevision: 0,
      })
    })

    await t.mutation(internal.outreachDelivery.onMessageReceived, {
      eventId: 'reply-2',
      message: {
        inbox_id: 'found-d@agentmail.to',
        message_id: 'message-reply-2',
        thread_id: 'thread-current',
      },
      thread: {},
    })

    await t.mutation(internal.outreachMailbox.markReadForAgent, {
      outreachId: draftId,
      sessionId: ownerSession,
      observedReplyRevision: 1,
    })
    await t.mutation(api.outreachInbox.markRead, {
      outreachId: draftId,
      sessionId: ownerSession,
      observedReplyRevision: 1,
    })
    await expect(
      t.run(async (ctx) => await ctx.db.get('outreachDrafts', draftId)),
    ).resolves.toMatchObject({
      replyRevision: 2,
      humanReadThroughReplyRevision: 1,
      agentReadThroughReplyRevision: 1,
    })
    await expect(
      t.query(api.outreachInbox.list, { sessionId: ownerSession }),
    ).resolves.toEqual([
      expect.objectContaining({ outreachId: draftId, unreadReplyCount: 1 }),
    ])
    await expect(
      t.query(internal.outreachMailbox.listForAgent, {
        sessionId: ownerSession,
        threadId,
      }),
    ).resolves.toEqual([
      expect.objectContaining({ outreachId: draftId, hasUnreadReply: true }),
    ])

    await t.mutation(internal.outreachMailbox.markReadForAgent, {
      outreachId: draftId,
      sessionId: ownerSession,
      observedReplyRevision: 2,
    })
    await t.mutation(api.outreachInbox.markRead, {
      outreachId: draftId,
      sessionId: ownerSession,
      observedReplyRevision: 2,
    })
    await expect(
      t.run(async (ctx) => await ctx.db.get('outreachDrafts', draftId)),
    ).resolves.toMatchObject({
      humanReadThroughReplyRevision: 2,
      agentReadThroughReplyRevision: 2,
    })
    await expect(
      t.query(api.outreachInbox.list, { sessionId: ownerSession }),
    ).resolves.toEqual([
      expect.objectContaining({ outreachId: draftId, unreadReplyCount: 0 }),
    ])
    await expect(
      t.query(internal.outreachMailbox.listForAgent, {
        sessionId: ownerSession,
        threadId,
      }),
    ).resolves.toEqual([
      expect.objectContaining({ outreachId: draftId, hasUnreadReply: false }),
    ])
  })
})
