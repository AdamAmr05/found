import { createTool } from '@convex-dev/agent'
import { makeFunctionReference } from 'convex/server'
import type { SessionId } from 'convex-helpers/server/sessions'

import {
  showOutreachDraftInputSchema,
  showOutreachDraftOutputSchema,
} from '../../shared/foundTools'
import type { Id } from '../_generated/dataModel'

type CreateDraftArgs = {
  sessionId: SessionId
  threadId: string
  toolCallId: string
  candidateRef?: string
  candidateTitle: string
  recipient?: string
  subject: string
  body: string
}

// A manual reference avoids a generated API → agent tools → generated API
// inference cycle while preserving the exact internal mutation contract.
const createDraft = makeFunctionReference<
  'mutation',
  CreateDraftArgs,
  Id<'outreachDrafts'>
>('outreachDrafts:createFromAgent')

export const showOutreachDraft = createTool({
  description: [
    'Create and present one editable email draft for one accommodation candidate.',
    'Call this only when the user asks to draft or write an email.',
    'Use the contact email found in the candidate sources when available; otherwise omit recipient so the user can add it.',
    'Write the complete email body. Nothing is sent by this tool.',
  ].join(' '),
  inputSchema: showOutreachDraftInputSchema,
  outputSchema: showOutreachDraftOutputSchema,
  execute: async (ctx, input, options) => {
    if (!ctx.userId || !ctx.threadId) {
      throw new Error('An owned Found thread is required to create outreach.')
    }
    // SAFETY: The Agent component stores the branded browser session ID as
    // userId, so this restores the brand at that component boundary.
    const sessionId = ctx.userId as SessionId
    const createArgs: CreateDraftArgs = {
      sessionId,
      threadId: ctx.threadId,
      toolCallId: options.toolCallId,
      candidateTitle: input.candidateTitle,
      subject: input.subject,
      body: input.body,
    }
    if (input.candidateRef) createArgs.candidateRef = input.candidateRef
    if (input.recipient) createArgs.recipient = input.recipient
    const draftId = await ctx.runMutation(createDraft, createArgs)
    return { draftId }
  },
})
