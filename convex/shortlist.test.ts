/// <reference types="vite/client" />

import { register as registerAgent } from '@convex-dev/agent/test'
import { convexTest } from 'convex-test'
import type { SessionId } from 'convex-helpers/server/sessions'
import { describe, expect, test } from 'vitest'

import { api, components, internal } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

// SAFETY: SessionId is a nominal brand over strings; these fixed values model
// one browser session at the public mutation boundary.
const ownerSession = 'owner-session' as SessionId
// SAFETY: SessionId is a nominal brand over strings; this distinct fixed value
// models a different browser session at the public mutation boundary.
const otherSession = 'other-session' as SessionId
const toolCallId = 'show-candidates-call'
const candidateRef = 'candidate-a'

function setup() {
  const t = convexTest(schema, modules)
  registerAgent(t)
  return t
}

async function createThread(
  t: ReturnType<typeof setup>,
  sessionId: SessionId,
): Promise<string> {
  const thread = await t.mutation(components.agent.threads.createThread, {
    userId: sessionId,
  })
  return thread._id
}

async function recordCandidatePart(
  t: ReturnType<typeof setup>,
  threadId: string,
): Promise<void> {
  await t.mutation(internal.candidateParts.record, {
    candidateRefs: [candidateRef],
    sessionId: ownerSession,
    threadId,
    toolCallId,
  })
}

describe('shortlist references', () => {
  test('normalizes a malformed component thread id to not found', async () => {
    const t = setup()

    await expect(
      t.query(api.shortlist.listForToolPart, {
        sessionId: ownerSession,
        threadId: 'not-a-convex-thread-id',
        toolCallId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'THREAD_NOT_FOUND' },
    })
  })

  test('rejects malformed candidate refs at the provenance boundary', async () => {
    const t = setup()
    const threadId = await createThread(t, ownerSession)

    await expect(
      t.mutation(internal.candidateParts.record, {
        candidateRefs: [''],
        sessionId: ownerSession,
        threadId,
        toolCallId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'INVALID_CANDIDATE_PART' },
    })
  })

  test('rejects a candidate ref that was not presented by the tool part', async () => {
    const t = setup()
    const threadId = await createThread(t, ownerSession)
    await recordCandidatePart(t, threadId)

    await expect(
      t.mutation(api.shortlist.setSaved, {
        candidateRef: 'fabricated-candidate',
        saved: true,
        sessionId: ownerSession,
        threadId,
        toolCallId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'CANDIDATE_PART_NOT_FOUND' },
    })
  })

  test('rejects a candidate ref presented in a different thread', async () => {
    const t = setup()
    const sourceThreadId = await createThread(t, ownerSession)
    const targetThreadId = await createThread(t, ownerSession)
    await recordCandidatePart(t, sourceThreadId)

    await expect(
      t.mutation(api.shortlist.setSaved, {
        candidateRef,
        saved: true,
        sessionId: ownerSession,
        threadId: targetThreadId,
        toolCallId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'CANDIDATE_PART_NOT_FOUND' },
    })
  })

  test('rejects a save from a session that does not own the thread', async () => {
    const t = setup()
    const threadId = await createThread(t, ownerSession)
    await recordCandidatePart(t, threadId)

    await expect(
      t.mutation(api.shortlist.setSaved, {
        candidateRef,
        saved: true,
        sessionId: otherSession,
        threadId,
        toolCallId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'THREAD_NOT_FOUND' },
    })
  })

  test('repeating the same save creates one shortlist relationship', async () => {
    const t = setup()
    const threadId = await createThread(t, ownerSession)
    await recordCandidatePart(t, threadId)
    const save = () =>
      t.mutation(api.shortlist.setSaved, {
        candidateRef,
        saved: true,
        sessionId: ownerSession,
        threadId,
        toolCallId,
      })

    await save()
    await save()

    await expect(
      t.query(api.shortlist.listForToolPart, {
        sessionId: ownerSession,
        threadId,
        toolCallId,
      }),
    ).resolves.toEqual([candidateRef])
  })
})
