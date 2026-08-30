import { createTool } from '@convex-dev/agent'
import { makeFunctionReference } from 'convex/server'
import type { SessionId } from 'convex-helpers/server/sessions'

import {
  listOutreachUpdatesInputSchema,
  listOutreachUpdatesOutputSchema,
  readOutreachThreadInputSchema,
  readOutreachThreadOutputSchema,
  type ListOutreachUpdatesOutput,
  type ReadOutreachThreadOutput,
} from '../../shared/foundTools'
import type { Id } from '../_generated/dataModel'

const listUpdates = makeFunctionReference<
  'query',
  { sessionId: SessionId; threadId: string },
  ListOutreachUpdatesOutput['updates']
>('outreachMailbox:listForAgent')

const readThread = makeFunctionReference<
  'action',
  {
    sessionId: SessionId
    foundThreadId: string
    outreachId: Id<'outreachDrafts'>
  },
  ReadOutreachThreadOutput
>('outreachMailbox:readThread')

function sessionId(value: string): SessionId {
  // SAFETY: Agent tool userId is the branded session ID supplied to the run.
  return value as SessionId
}

function outreachId(value: string): Id<'outreachDrafts'> {
  // SAFETY: This tool accepts the ID emitted by listOutreachUpdates.
  return value as Id<'outreachDrafts'>
}

export const listOutreachUpdates = createTool({
  description:
    'List the email outreach drafts, delivery states, and unread reply flags associated with this Found thread. Use this before answering broad questions such as whether anyone replied.',
  inputSchema: listOutreachUpdatesInputSchema,
  outputSchema: listOutreachUpdatesOutputSchema,
  execute: async (ctx) => {
    if (!ctx.userId || !ctx.threadId) {
      throw new Error('An owned Found thread is required to list outreach.')
    }
    const updates = await ctx.runQuery(listUpdates, {
      sessionId: sessionId(ctx.userId),
      threadId: ctx.threadId,
    })
    return { updates }
  },
})

export const readOutreachThread = createTool({
  description:
    'Read one complete email conversation after choosing its outreachId from listOutreachUpdates. Use only when the email content is relevant to the user’s current request.',
  inputSchema: readOutreachThreadInputSchema,
  outputSchema: readOutreachThreadOutputSchema,
  execute: async (ctx, input) => {
    if (!ctx.userId || !ctx.threadId) {
      throw new Error('An owned Found thread is required to read outreach.')
    }
    return await ctx.runAction(readThread, {
      sessionId: sessionId(ctx.userId),
      foundThreadId: ctx.threadId,
      outreachId: outreachId(input.outreachId),
    })
  },
})
