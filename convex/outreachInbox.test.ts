/// <reference types="vite/client" />

import { convexTest } from 'convex-test'
import type { FunctionReturnType } from 'convex/server'
import { expect, test } from 'vitest'

import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

test('pages through more than 100 inbox conversations in activity order without mixing owners', async () => {
  const t = convexTest(schema, modules)
  const { ownerId, ids } = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert('users', { displayName: 'Owner' })
    const otherId = await ctx.db.insert('users', { displayName: 'Other' })
    const ids: Id<'outreachDrafts'>[] = []
    for (let index = 0; index < 106; index += 1) {
      const id = await ctx.db.insert('outreachDrafts', {
        userId: index === 105 ? otherId : ownerId,
        threadId: 'fixture-thread',
        toolCallId: `outreach-${index}`,
        candidateTitle: `Place ${index}`,
        recipient: 'contact@example.com',
        subject: 'Availability',
        body: 'Is this place available?',
        revision: 1,
        lastAgentSeenRevision: 1,
        state: 'draft',
        updatedAt: index,
        latestActivityAt: index,
        replyRevision: 0,
        humanReadThroughReplyRevision: 0,
        agentReadThroughReplyRevision: 0,
      })
      if (index < 105) ids.push(id)
    }
    return { ownerId, ids }
  })
  const owner = t.withIdentity({ subject: ownerId })
  let cursor: string | null = null
  const received: Id<'outreachDrafts'>[] = []
  const pageSizes: number[] = []
  let isDone = false
  // Bound the walk so a broken continuation fails rather than looping forever.
  for (let pageNumber = 0; pageNumber < 6; pageNumber += 1) {
    const result: FunctionReturnType<typeof api.outreachInbox.list> =
      await owner.query(api.outreachInbox.list, {
        paginationOpts: { cursor, numItems: 20 },
      })
    received.push(...result.page.map((item) => item.outreachId))
    pageSizes.push(result.page.length)
    cursor = result.continueCursor
    isDone = result.isDone
    if (isDone) break
  }
  expect(received).toEqual([...ids].reverse())
  expect(pageSizes).toEqual([20, 20, 20, 20, 20, 5])
  expect(isDone).toBe(true)
})

test('returns an exhausted empty page and rejects unauthenticated access', async () => {
  const t = convexTest(schema, modules)
  const userId = await t.run(async (ctx) =>
    ctx.db.insert('users', { displayName: 'Empty inbox' }),
  )
  const args = { paginationOpts: { cursor: null, numItems: 20 } }
  await expect(
    t.withIdentity({ subject: userId }).query(api.outreachInbox.list, args),
  ).resolves.toMatchObject({ page: [], isDone: true })
  await expect(t.query(api.outreachInbox.list, args)).rejects.toMatchObject({
    data: { code: 'UNAUTHENTICATED' },
  })
})
