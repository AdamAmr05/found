import { AgentMail } from '@agentmail/convex'
import { makeFunctionReference } from 'convex/server'
import { ConvexError, v } from 'convex/values'
import { vSessionId } from 'convex-helpers/server/sessions'
import type { SessionId } from 'convex-helpers/server/sessions'
import { z } from 'zod'

import {
  OUTREACH_BODY_MAX_LENGTH,
  OUTREACH_THREAD_MAX_MESSAGES,
} from '../shared/foundTools'
import type { Id } from './_generated/dataModel'
import { components } from './_generated/api'
import {
  type ActionCtx,
  env,
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server'
import { ownedDraft } from './outreachDrafts'
import { emailBodyToPlainText } from './outreachMailText'
import {
  type OutreachMailThread,
  vOutreachMailThread,
  vOutreachState,
} from './outreachModel'
import {
  agentHasUnreadReply,
  agentReadThroughReplyRevision,
  observedReplyRevision,
  replyRevision,
} from './outreachReplyState'
import { assertThreadOwner } from './threadAccess'

const agentmail = new AgentMail(components.agentmail)

type ThreadDetails = {
  candidateTitle: string
  subject: string
  agentmailThreadId: string
  observedReplyRevision: number
}

type ReadThreadArgs = {
  sessionId: SessionId
  foundThreadId: string
  outreachId: Id<'outreachDrafts'>
}

const getThreadDetails = makeFunctionReference<
  'query',
  {
    sessionId: SessionId
    foundThreadId: string
    outreachId: Id<'outreachDrafts'>
  },
  ThreadDetails | null
>('outreachMailbox:detailsForAgent')

const markThreadSeenByAgent = makeFunctionReference<
  'mutation',
  {
    sessionId: SessionId
    outreachId: Id<'outreachDrafts'>
    observedReplyRevision: number
  },
  null
>('outreachMailbox:markReadForAgent')

const addressSchema = z.union([z.string(), z.array(z.string())])
const messageSchema = z.object({
  message_id: z.string(),
  timestamp: z.string(),
  from: addressSchema,
  to: z.array(z.string()).default([]),
  text: z.string().optional(),
  extracted_text: z.string().optional(),
  html: z.string().optional(),
  extracted_html: z.string().optional(),
  preview: z.string().optional(),
})
const threadSchema = z.object({
  // AgentMail's Get Thread endpoint is not paginated. Keep only the recent
  // window at this external boundary, then validate those messages precisely.
  messages: z.array(z.unknown()),
})
type AgentMailThreadPayload = z.infer<typeof threadSchema>

async function fetchAgentMailThread(
  ctx: ActionCtx,
  inboxId: string,
  threadId: string,
): Promise<AgentMailThreadPayload> {
  try {
    const payload: unknown = await agentmail.getThread(ctx, inboxId, threadId)
    return threadSchema.parse(payload)
  } catch {
    throw new ConvexError({ code: 'OUTREACH_THREAD_READ_FAILED' })
  }
}

const vUpdate = v.object({
  outreachId: v.string(),
  candidateTitle: v.string(),
  state: vOutreachState,
  hasUnreadReply: v.boolean(),
  latestActivityAt: v.number(),
})

const vRunDraft = v.object({
  outreachId: v.id('outreachDrafts'),
  candidateTitle: v.string(),
  recipient: v.string(),
  subject: v.string(),
  body: v.string(),
  revision: v.number(),
})

export const listForAgent = internalQuery({
  args: { sessionId: vSessionId, threadId: v.string() },
  returns: v.array(vUpdate),
  handler: async (ctx, args) => {
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    const drafts = await ctx.db
      .query('outreachDrafts')
      .withIndex('by_session_and_thread_and_latest_activity', (index) =>
        index.eq('sessionId', args.sessionId).eq('threadId', args.threadId),
      )
      .order('desc')
      .take(50)
    return drafts.map((draft) => ({
      outreachId: draft._id,
      candidateTitle: draft.candidateTitle,
      state: draft.state,
      hasUnreadReply: agentHasUnreadReply(draft),
      latestActivityAt: draft.latestActivityAt,
    }))
  },
})

export const contextForRun = internalQuery({
  args: { sessionId: vSessionId, threadId: v.string() },
  returns: v.object({
    changedDrafts: v.array(vRunDraft),
    unreadReplies: v.array(
      v.object({
        outreachId: v.id('outreachDrafts'),
        candidateTitle: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    const drafts = await ctx.db
      .query('outreachDrafts')
      .withIndex('by_session_and_thread_and_latest_activity', (index) =>
        index.eq('sessionId', args.sessionId).eq('threadId', args.threadId),
      )
      .order('desc')
      .take(50)
    return {
      changedDrafts: drafts.flatMap((draft) =>
        draft.revision > draft.lastAgentSeenRevision
          ? [
              {
                outreachId: draft._id,
                candidateTitle: draft.candidateTitle,
                recipient: draft.recipient,
                subject: draft.subject,
                body: draft.body,
                revision: draft.revision,
              },
            ]
          : [],
      ),
      unreadReplies: drafts.flatMap((draft) =>
        agentHasUnreadReply(draft)
          ? [
              {
                outreachId: draft._id,
                candidateTitle: draft.candidateTitle,
              },
            ]
          : [],
      ),
    }
  },
})

export const markAgentSeen = internalMutation({
  args: {
    sessionId: vSessionId,
    threadId: v.string(),
    revisions: v.array(
      v.object({
        outreachId: v.id('outreachDrafts'),
        revision: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    for (const seen of args.revisions.slice(0, 50)) {
      const draft = await ctx.db.get('outreachDrafts', seen.outreachId)
      if (
        draft?.sessionId === args.sessionId &&
        draft.threadId === args.threadId &&
        seen.revision > draft.lastAgentSeenRevision &&
        seen.revision <= draft.revision
      ) {
        await ctx.db.patch('outreachDrafts', draft._id, {
          lastAgentSeenRevision: seen.revision,
        })
      }
    }
    return null
  },
})

export const detailsForAgent = internalQuery({
  args: {
    sessionId: vSessionId,
    foundThreadId: v.string(),
    outreachId: v.id('outreachDrafts'),
  },
  returns: v.union(
    v.null(),
    v.object({
      candidateTitle: v.string(),
      subject: v.string(),
      agentmailThreadId: v.string(),
      observedReplyRevision: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.outreachId, args.sessionId)
    if (draft.threadId !== args.foundThreadId || !draft.agentmailThreadId) {
      return null
    }
    return {
      candidateTitle: draft.candidateTitle,
      subject: draft.subject,
      agentmailThreadId: draft.agentmailThreadId,
      observedReplyRevision: replyRevision(draft),
    }
  },
})

async function loadThreadData(
  ctx: ActionCtx,
  args: ReadThreadArgs,
): Promise<OutreachMailThread> {
  const details = await ctx.runQuery(getThreadDetails, args)
  const inboxId = env.AGENTMAIL_INBOX_ID
  if (!details || !inboxId) {
    throw new ConvexError({ code: 'OUTREACH_THREAD_NOT_AVAILABLE' })
  }
  const response = await fetchAgentMailThread(
    ctx,
    inboxId,
    details.agentmailThreadId,
  )
  const omittedMessageCount = Math.max(
    0,
    response.messages.length - OUTREACH_THREAD_MAX_MESSAGES,
  )
  const messages = response.messages
    .slice(-OUTREACH_THREAD_MAX_MESSAGES)
    .map((message) => messageSchema.parse(message))
  return {
    outreachId: args.outreachId,
    candidateTitle: details.candidateTitle,
    subject: details.subject,
    observedReplyRevision: details.observedReplyRevision,
    omittedMessageCount,
    messages: messages.map((message) => {
      const from = Array.isArray(message.from)
        ? message.from.join(', ')
        : message.from
      const fullBody = emailBodyToPlainText({
        extractedText: message.extracted_text,
        text: message.text,
        extractedHtml: message.extracted_html,
        html: message.html,
        preview: message.preview,
      })
      return {
        messageId: message.message_id,
        direction: from.includes(inboxId)
          ? ('outbound' as const)
          : ('inbound' as const),
        from,
        to: message.to,
        timestamp: message.timestamp,
        body: fullBody.slice(0, OUTREACH_BODY_MAX_LENGTH),
        bodyTruncated: fullBody.length > OUTREACH_BODY_MAX_LENGTH,
      }
    }),
  }
}

const readThreadArgs = {
  sessionId: vSessionId,
  foundThreadId: v.string(),
  outreachId: v.id('outreachDrafts'),
}

export const readThreadForAgent = internalAction({
  args: readThreadArgs,
  returns: vOutreachMailThread,
  handler: async (ctx, args) => {
    const thread = await loadThreadData(ctx, args)
    await ctx.runMutation(markThreadSeenByAgent, {
      sessionId: args.sessionId,
      outreachId: args.outreachId,
      observedReplyRevision: thread.observedReplyRevision,
    })
    return thread
  },
})

export const readThread = internalAction({
  args: readThreadArgs,
  returns: vOutreachMailThread,
  handler: loadThreadData,
})

export const markReadForAgent = internalMutation({
  args: {
    sessionId: vSessionId,
    outreachId: v.id('outreachDrafts'),
    observedReplyRevision: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.outreachId, args.sessionId)
    const currentRevision = replyRevision(draft)
    const currentReadThrough = agentReadThroughReplyRevision(draft)
    const observedRevision = observedReplyRevision(
      args.observedReplyRevision,
      currentRevision,
    )
    const nextReadThrough = Math.max(currentReadThrough, observedRevision)
    if (nextReadThrough !== draft.agentReadThroughReplyRevision) {
      await ctx.db.patch('outreachDrafts', draft._id, {
        agentReadThroughReplyRevision: nextReadThrough,
      })
    }
    return null
  },
})
