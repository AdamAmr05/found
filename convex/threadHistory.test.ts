/// <reference types="vite/client" />

import { register as registerAgent } from '@convex-dev/agent/test'
import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'

import { api, components } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

test('paginates existing conversations newest first and isolates owners', async () => {
  const t = convexTest(schema, modules)
  registerAgent(t)
  const ownerId = await t.run((ctx) =>
    ctx.db.insert('users', { displayName: 'Owner' }),
  )
  const otherId = await t.run((ctx) =>
    ctx.db.insert('users', { displayName: 'Other' }),
  )
  const older = await t.mutation(components.agent.threads.createThread, {
    userId: ownerId,
    title: 'Berlin room',
  })
  await t.mutation(components.agent.threads.createThread, {
    userId: otherId,
    title: 'Private conversation',
  })
  const newer = await t.mutation(components.agent.threads.createThread, {
    userId: ownerId,
    title: 'Lisbon apartment',
  })
  const owner = t.withIdentity({ subject: ownerId })
  const first = await owner.query(api.threadHistory.list, {
    paginationOpts: { cursor: null, numItems: 1 },
  })
  expect(first.page.map((thread) => thread._id)).toEqual([newer._id])
  expect(first.isDone).toBe(false)
  const next = await owner.query(api.threadHistory.list, {
    paginationOpts: { cursor: first.continueCursor, numItems: 1 },
  })
  expect(next.page.map((thread) => thread._id)).toEqual([older._id])
  const other = await t
    .withIdentity({ subject: otherId })
    .query(api.threadHistory.list, {
      paginationOpts: { cursor: null, numItems: 20 },
    })
  expect(other.page.map((thread) => thread.title)).toEqual([
    'Private conversation',
  ])
  await expect(
    owner.query(api.thread.canResume, { threadId: other.page[0]?._id ?? '' }),
  ).resolves.toBe(false)
  await expect(
    t.query(api.threadHistory.list, {
      paginationOpts: { cursor: null, numItems: 20 },
    }),
  ).rejects.toMatchObject({ data: { code: 'UNAUTHENTICATED' } })
})
