/// <reference types="vite/client" />

import { register as registerAgent } from '@convex-dev/agent/test'
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'

import { api, components, internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { candidateToolCalls } from './candidatePartMessages'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

const toolCallId = 'show-candidates-call'
const candidateRef = 'candidate-a'

type TestApp = ReturnType<typeof createApp>

type TestUser = {
  readonly id: Id<'users'>
  readonly as: ReturnType<TestApp['withIdentity']>
}

// Convex Auth mints access tokens whose subject is the `users` id, so a
// signed-in caller is modelled by an identity with that subject.
async function createUser(t: TestApp, displayName: string): Promise<TestUser> {
  const id = await t.run(
    async (ctx) => await ctx.db.insert('users', { displayName }),
  )
  return { id, as: t.withIdentity({ subject: id }) }
}

function createApp() {
  const t = convexTest(schema, modules)
  registerAgent(t)
  return t
}

async function setup() {
  const t = createApp()
  return {
    t,
    owner: await createUser(t, 'Owner'),
    other: await createUser(t, 'Other'),
  }
}

async function createThread(t: TestApp, userId: Id<'users'>): Promise<string> {
  const thread = await t.mutation(components.agent.threads.createThread, {
    userId,
  })
  return thread._id
}

async function recordCandidatePart(
  t: TestApp,
  userId: Id<'users'>,
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
    userId,
    threadId,
  })
}

const firstPage = { cursor: null, numItems: 1 }

describe('saved candidate references', () => {
  test('derives one shortlist preview from persisted research tool output', async () => {
    const { t, owner } = await setup()
    const threadId = await createThread(t, owner.id)
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
    const { owner } = await setup()

    await expect(
      owner.as.mutation(api.savedCandidates.setSaved, {
        candidateRef,
        saved: true,
        threadId: 'not-a-convex-thread-id',
        toolCallId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'THREAD_NOT_FOUND' },
    })
  })

  test('rejects malformed candidate refs at the provenance boundary', async () => {
    const { t, owner } = await setup()
    const threadId = await createThread(t, owner.id)

    await expect(
      t.mutation(internal.candidateParts.recordBatch, {
        parts: [
          {
            candidateRefs: [''],
            messageId: 'message-a',
            toolCallId,
          },
        ],
        userId: owner.id,
        threadId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'INVALID_CANDIDATE_PART' },
    })
  })

  test('rejects a candidate ref that was not presented by the tool part', async () => {
    const { t, owner } = await setup()
    const threadId = await createThread(t, owner.id)
    await recordCandidatePart(t, owner.id, threadId)

    await expect(
      owner.as.mutation(api.savedCandidates.setSaved, {
        candidateRef: 'fabricated-candidate',
        saved: true,
        threadId,
        toolCallId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'CANDIDATE_PART_NOT_FOUND' },
    })
  })

  test('rejects a candidate ref presented in a different thread', async () => {
    const { t, owner } = await setup()
    const sourceThreadId = await createThread(t, owner.id)
    const targetThreadId = await createThread(t, owner.id)
    await recordCandidatePart(t, owner.id, sourceThreadId)

    await expect(
      owner.as.mutation(api.savedCandidates.setSaved, {
        candidateRef,
        saved: true,
        threadId: targetThreadId,
        toolCallId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'CANDIDATE_PART_NOT_FOUND' },
    })
  })

  test('rejects a save from a user who does not own the thread', async () => {
    const { t, owner, other } = await setup()
    const threadId = await createThread(t, owner.id)
    await recordCandidatePart(t, owner.id, threadId)

    await expect(
      other.as.mutation(api.savedCandidates.setSaved, {
        candidateRef,
        saved: true,
        threadId,
        toolCallId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'THREAD_NOT_FOUND' },
    })
  })

  test('repeating the same save creates one relationship', async () => {
    const { t, owner } = await setup()
    const threadId = await createThread(t, owner.id)
    await recordCandidatePart(t, owner.id, threadId)
    const save = () =>
      owner.as.mutation(api.savedCandidates.setSaved, {
        candidateRef,
        saved: true,
        threadId,
        toolCallId,
      })

    await save()
    await save()

    await expect(
      owner.as.query(api.savedCandidates.listForToolPart, {
        threadId,
        toolCallId,
      }),
    ).resolves.toEqual({ ready: true, savedRefs: [candidateRef] })
  })

  test('reports that saving is unavailable until provenance is recorded', async () => {
    const { t, owner } = await setup()
    const threadId = await createThread(t, owner.id)

    await expect(
      owner.as.query(api.savedCandidates.listForToolPart, {
        threadId,
        toolCallId,
      }),
    ).resolves.toEqual({ ready: false, savedRefs: [] })
    await expect(
      owner.as.mutation(api.savedCandidates.setSaved, {
        candidateRef,
        saved: true,
        threadId,
        toolCallId,
      }),
    ).rejects.toMatchObject({
      data: { code: 'CANDIDATE_PART_NOT_FOUND' },
    })

    await recordCandidatePart(t, owner.id, threadId)

    await expect(
      owner.as.query(api.savedCandidates.listForToolPart, {
        threadId,
        toolCallId,
      }),
    ).resolves.toEqual({ ready: true, savedRefs: [] })
  })

  test('projects one table as a thread shortlist and global bookmarks', async () => {
    const { t, owner } = await setup()
    const firstThreadId = await createThread(t, owner.id)
    const secondThreadId = await createThread(t, owner.id)
    const secondCandidateRef = 'candidate-b'
    const secondToolCallId = 'show-candidates-call-b'
    await recordCandidatePart(t, owner.id, firstThreadId)
    await recordCandidatePart(
      t,
      owner.id,
      secondThreadId,
      secondCandidateRef,
      secondToolCallId,
    )

    await owner.as.mutation(api.savedCandidates.setSaved, {
      candidateRef,
      saved: true,
      threadId: firstThreadId,
      toolCallId,
    })
    await owner.as.mutation(api.savedCandidates.setSaved, {
      candidateRef: secondCandidateRef,
      saved: true,
      threadId: secondThreadId,
      toolCallId: secondToolCallId,
    })

    const shortlist = await owner.as.query(api.savedCandidates.listForThread, {
      threadId: firstThreadId,
      paginationOpts: firstPage,
    })
    const bookmarks = await owner.as.query(api.savedCandidates.listBookmarks, {
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

    const remainingBookmarks = await owner.as.query(
      api.savedCandidates.listBookmarks,
      {
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
    const { t, owner } = await setup()
    const threadId = await createThread(t, owner.id)
    await recordCandidatePart(t, owner.id, threadId)
    await recordCandidatePart(
      t,
      owner.id,
      threadId,
      'candidate-b',
      'show-candidates-call-b',
    )
    await owner.as.mutation(api.savedCandidates.setSaved, {
      candidateRef,
      saved: true,
      threadId,
      toolCallId,
    })
    await owner.as.mutation(api.savedCandidates.setSaved, {
      candidateRef: 'candidate-b',
      saved: true,
      threadId,
      toolCallId: 'show-candidates-call-b',
    })
    const messageId = await t.run(async (ctx) => {
      const entry = await ctx.db
        .query('savedCandidates')
        .withIndex('by_user_and_thread_and_tool_call_and_candidate', (index) =>
          index
            .eq('userId', owner.id)
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

    const bookmarks = await owner.as.query(api.savedCandidates.listBookmarks, {
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
