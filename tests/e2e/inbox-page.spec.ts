import { expect, test } from '@playwright/test'
import { z } from 'zod'

const querySet = z.object({
  type: z.literal('ModifyQuerySet'),
  baseVersion: z.number(),
  newVersion: z.number(),
  modifications: z.array(
    z.discriminatedUnion('type', [
      z.object({ type: z.literal('Remove'), queryId: z.number() }),
      z.object({
        type: z.literal('Add'),
        queryId: z.number(),
        args: z.tuple([
          z.object({
            state: z.string().optional(),
            paginationOpts: z.object({ cursor: z.string().nullable() }),
          }),
        ]),
      }),
    ]),
  ),
})

test('preserves the filter and loaded pages after opening a conversation', async ({
  page,
}) => {
  await page.routeWebSocket('wss://inbox-fixture.convex.cloud/**', (socket) => {
    socket.onMessage((raw) => {
      // Only the external transport is faked; InboxPage and Convex pagination run unchanged.
      const parsed = querySet.safeParse(JSON.parse(raw.toString()))
      if (!parsed.success) return
      const message = parsed.data
      socket.send(
        JSON.stringify({
          type: 'Transition',
          startVersion: {
            querySet: message.baseVersion,
            identity: 0,
            ts: 'AAAAAAAAAAA=',
          },
          endVersion: {
            querySet: message.newVersion,
            identity: 0,
            ts: 'AAAAAAAAAAA=',
          },
          modifications: message.modifications.map((modification) => {
            if (modification.type === 'Remove') {
              return { type: 'QueryRemoved', queryId: modification.queryId }
            }
            const args = modification.args[0]
            const second = args.paginationOpts.cursor !== null
            return {
              type: 'QueryUpdated',
              queryId: modification.queryId,
              logLines: [],
              value: {
                page: [
                  {
                    outreachId: second ? 'second' : 'first',
                    threadId: 'fixture-thread',
                    candidateTitle: second ? 'Older reply' : 'Latest reply',
                    recipient: 'contact@example.com',
                    subject: 'Availability',
                    state: args.state ?? 'sent',
                    unreadReplyCount: 0,
                    latestActivityAt: 1,
                    canReadThread: true,
                  },
                ],
                isDone: second,
                continueCursor: second ? 'done' : 'next',
              },
            }
          }),
        }),
      )
    })
  })
  await page.route('**/tests/fixtures/inbox-page.html', (route) =>
    route.fulfill({
      path: 'tests/fixtures/inbox-page.html',
      contentType: 'text/html',
    }),
  )
  await page.goto('/tests/fixtures/inbox-page.html')
  const replied = page.getByRole('button', { name: 'Replied', exact: true })
  await replied.click()
  await page.getByRole('button', { name: 'Load more conversations' }).click()
  const older = page.getByRole('button', {
    name: 'Open outreach to Older reply',
  })
  await older.click()
  await expect(page.getByText('Loading conversation…')).toBeVisible()
  await expect(replied).toBeHidden()
  await page.getByRole('button', { name: 'Inbox', exact: true }).click()
  await expect(replied).toHaveAttribute('aria-pressed', 'true')
  await expect(older).toBeVisible()
  await expect(
    page.getByRole('button', { name: /Open outreach to/ }),
  ).toHaveCount(2)
  await expect(
    page.getByRole('button', { name: 'Load more conversations' }),
  ).toHaveCount(0)
})
