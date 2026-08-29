/// <reference types="vite/client" />

import { register as registerAgent } from '@convex-dev/agent/test'
import { convexTest } from 'convex-test'
import type { SessionId } from 'convex-helpers/server/sessions'
import { describe, expect, test } from 'vitest'

import { api, components, internal } from './_generated/api'
import { candidateToolCalls } from './candidatePartMessages'
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
  ref = candidateRef,
  callId = toolCallId,
): Promise<void> {
  const input = {
    candidates: [
      {
        ref,
        title: `Candidate ${ref}`,
        location: { label: 'Berlin, Germany' },
        sources: [
          {
            ref: 'source-a',
            url: 'https://example.com/overview',
            label: 'Example overview',
          },
          {
            ref: 'source-b',
            url: 'https://example.com/listing',
            label: 'Example listing',
          },
        ],
        atAGlance: { summary: 'A useful saved candidate.', facts: [] },
        evidence: [],
        nextMove: { summary: 'Review the listing.' },
      },
    ],
  }
  const { messages } = await t.mutation(components.agent.messages.addMessages, {
    threadId,
    messages: [
      {
        message: {
          role: 'assistant',
          content: [
            {
              type: 'tool-call',
              toolName: 'showCandidates',
              toolCallId: callId,
              input,
            },
          ],
        },
      },
    ],
  })
  const message = messages[0]
  if (!message) throw new Error('Expected the candidate tool message')
  await t.mutation(internal.candidateParts.recordBatch, {
    parts: [
      {
        candidateRefs: [ref],
        messageId: message._id,
        previewImages: [
          {
            candidateRef: ref,
            sourceRef: 'source-b',
            url: 'https://example.com/listing-photo.jpg',
          },
        ],
        toolCallId: callId,
      },
    ],
    sessionId: ownerSession,
    threadId,
  })
}

const firstPage = { cursor: null, numItems: 1 }

describe('saved candidate references', () => {
  test('derives one shortlist preview from persisted research tool output', async () => {
    const t = setup()
    const threadId = await createThread(t, ownerSession)
    const input = {
      candidates: [
        {
          ref: candidateRef,
          title: 'Candidate A',
          location: { label: 'Berlin, Germany' },
          sources: [
            {
              ref: 'source-a',
              url: 'https://example.com/overview',
              label: 'Example overview',
            },
            {
              ref: 'source-b',
              url: 'https://example.com/listing',
              label: 'Example listing',
            },
          ],
          atAGlance: { summary: 'A useful candidate.', facts: [] },
          evidence: [],
          nextMove: { summary: 'Review the listing.' },
        },
      ],
    }
    const { messages } = await t.mutation(
      components.agent.messages.addMessages,
      {
        threadId,
        messages: [
          {
            message: {
              role: 'assistant',
              content: [
                {
                  type: 'tool-call',
                  toolName: 'readPage',
                  toolCallId: 'read-page-call',
                  input: { url: 'https://example.com/listing' },
                },
              ],
            },
          },
          {
            message: {
              role: 'tool',
              content: [
                {
                  type: 'tool-result',
                  toolName: 'readPage',
                  toolCallId: 'read-page-call',
                  result: {
                    url: 'https://example.com/listing',
                    mode: 'full',
                    content: 'Listing details',
                    images: ['https://example.com/property.jpg'],
                    truncated: false,
                  },
                },
              ],
            },
          },
          {
            message: {
              role: 'assistant',
              content: [
                {
                  type: 'tool-call',
                  toolName: 'showCandidates',
                  toolCallId,
                  input,
                },
              ],
            },
          },
        ],
      },
    )

    expect(candidateToolCalls(messages)).toMatchObject([
      {
        candidateRefs: [candidateRef],
        previewImages: [
          {
            candidateRef,
            sourceRef: 'source-b',
            url: 'https://example.com/property.jpg',
          },
        ],
        toolCallId,
      },
    ])
  })

  test('normalizes a malformed component thread id on writes', async () => {
    const t = setup()

    await expect(
      t.mutation(api.savedCandidates.setSaved, {
        candidateRef,
        saved: true,
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
      t.mutation(internal.candidateParts.recordBatch, {
        parts: [
          {
            candidateRefs: [''],
            messageId: 'message-a',
            toolCallId,
          },
        ],
        sessionId: ownerSession,
        threadId,
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
      t.mutation(api.savedCandidates.setSaved, {
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
      t.mutation(api.savedCandidates.setSaved, {
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
      t.mutation(api.savedCandidates.setSaved, {
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

  test('repeating the same save creates one relationship', async () => {
    const t = setup()
    const threadId = await createThread(t, ownerSession)
    await recordCandidatePart(t, threadId)
    const save = () =>
      t.mutation(api.savedCandidates.setSaved, {
        candidateRef,
        saved: true,
        sessionId: ownerSession,
        threadId,
        toolCallId,
      })

    await save()
    await save()

    await expect(
      t.query(api.savedCandidates.listForToolPart, {
        sessionId: ownerSession,
        threadId,
        toolCallId,
      }),
    ).resolves.toEqual({ ready: true, savedRefs: [candidateRef] })
  })

  test('reports that saving is unavailable until provenance is recorded', async () => {
    const t = setup()
    const threadId = await createThread(t, ownerSession)

    await expect(
      t.query(api.savedCandidates.listForToolPart, {
        sessionId: ownerSession,
        threadId,
        toolCallId,
      }),
    ).resolves.toEqual({ ready: false, savedRefs: [] })
    await expect(
      t.mutation(api.savedCandidates.setSaved, {
        candidateRef,
        saved: true,
        sessionId: ownerSession,
        threadId,
        toolCallId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'CANDIDATE_PART_NOT_FOUND' },
    })

    await recordCandidatePart(t, threadId)

    await expect(
      t.query(api.savedCandidates.listForToolPart, {
        sessionId: ownerSession,
        threadId,
        toolCallId,
      }),
    ).resolves.toEqual({ ready: true, savedRefs: [] })
  })

  test('projects one table as a thread shortlist and global bookmarks', async () => {
    const t = setup()
    const firstThreadId = await createThread(t, ownerSession)
    const secondThreadId = await createThread(t, ownerSession)
    const secondCandidateRef = 'candidate-b'
    const secondToolCallId = 'show-candidates-call-b'
    await recordCandidatePart(t, firstThreadId)
    await recordCandidatePart(
      t,
      secondThreadId,
      secondCandidateRef,
      secondToolCallId,
    )

    await t.mutation(api.savedCandidates.setSaved, {
      candidateRef,
      saved: true,
      sessionId: ownerSession,
      threadId: firstThreadId,
      toolCallId,
    })
    await t.mutation(api.savedCandidates.setSaved, {
      candidateRef: secondCandidateRef,
      saved: true,
      sessionId: ownerSession,
      threadId: secondThreadId,
      toolCallId: secondToolCallId,
    })

    const shortlist = await t.query(api.savedCandidates.listForThread, {
      sessionId: ownerSession,
      threadId: firstThreadId,
      paginationOpts: firstPage,
    })
    const bookmarks = await t.query(api.savedCandidates.listBookmarks, {
      sessionId: ownerSession,
      paginationOpts: firstPage,
    })

    expect(shortlist.page).toMatchObject([
      {
        candidateRef,
        imageUrl: 'https://example.com/listing-photo.jpg',
        source: {
          label: 'Example listing',
          url: 'https://example.com/listing',
        },
        state: 'available',
        threadId: firstThreadId,
        toolCallId,
      },
    ])
    expect(bookmarks.page).toHaveLength(1)
    expect(bookmarks.isDone).toBe(false)

    const remainingBookmarks = await t.query(
      api.savedCandidates.listBookmarks,
      {
        sessionId: ownerSession,
        paginationOpts: {
          cursor: bookmarks.continueCursor,
          numItems: 1,
        },
      },
    )
    expect(remainingBookmarks.page).toHaveLength(1)
    expect(remainingBookmarks.isDone).toBe(true)
    expect([...bookmarks.page, ...remainingBookmarks.page]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ candidateRef, threadId: firstThreadId }),
        expect.objectContaining({
          candidateRef: secondCandidateRef,
          threadId: secondThreadId,
        }),
      ]),
    )
  })

  test('isolates a broken saved reference without failing the page', async () => {
    const t = setup()
    const threadId = await createThread(t, ownerSession)
    await recordCandidatePart(t, threadId)
    await recordCandidatePart(
      t,
      threadId,
      'candidate-b',
      'show-candidates-call-b',
    )
    await t.mutation(api.savedCandidates.setSaved, {
      candidateRef,
      saved: true,
      sessionId: ownerSession,
      threadId,
      toolCallId,
    })
    await t.mutation(api.savedCandidates.setSaved, {
      candidateRef: 'candidate-b',
      saved: true,
      sessionId: ownerSession,
      threadId,
      toolCallId: 'show-candidates-call-b',
    })
    const messageId = await t.run(async (ctx) => {
      const entry = await ctx.db
        .query('savedCandidates')
        .withIndex('by_session_and_thread_and_tool_and_candidate', (index) =>
          index
            .eq('sessionId', ownerSession)
            .eq('threadId', threadId)
            .eq('toolCallId', toolCallId)
            .eq('candidateRef', candidateRef),
        )
        .unique()
      if (!entry) throw new Error('Expected saved candidate')
      return entry.messageId
    })
    await t.mutation(components.agent.messages.deleteByIds, {
      messageIds: [messageId],
    })

    const bookmarks = await t.query(api.savedCandidates.listBookmarks, {
      sessionId: ownerSession,
      paginationOpts: { cursor: null, numItems: 10 },
    })

    expect(bookmarks.page).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          candidateRef: 'candidate-b',
          state: 'available',
        }),
        expect.objectContaining({
          candidateRef,
          state: 'unavailable',
        }),
      ]),
    )
  })
})
