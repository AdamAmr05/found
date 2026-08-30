/// <reference types="vite/client" />

import { register as registerAgent } from '@convex-dev/agent/test'
import { convexTest } from 'convex-test'
import type { SessionId } from 'convex-helpers/server/sessions'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { api, components, internal } from './_generated/api'
import schema from './schema'

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
})
