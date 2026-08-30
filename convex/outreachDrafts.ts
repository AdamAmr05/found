import { ConvexError, v } from 'convex/values'
import { SessionIdArg, vSessionId } from 'convex-helpers/server/sessions'
import type { SessionId } from 'convex-helpers/server/sessions'

import {
  OUTREACH_BODY_MAX_LENGTH,
  OUTREACH_INSTRUCTION_MAX_LENGTH,
  OUTREACH_SUBJECT_MAX_LENGTH,
} from '../shared/foundTools'
import type { Doc, Id } from './_generated/dataModel'
import {
  type MutationCtx,
  type QueryCtx,
  env,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server'
import {
  normalizeOutreachRecipient,
  normalizeOutreachSubject,
  outreachContentHash,
  validateOutreachContent,
} from './outreachContent'
import { assertThreadOwner } from './threadAccess'

const vDraftView = v.object({
  _id: v.id('outreachDrafts'),
  candidateRef: v.optional(v.string()),
  candidateTitle: v.string(),
  recipient: v.string(),
  subject: v.string(),
  body: v.string(),
  revision: v.number(),
  state: v.union(
    v.literal('draft'),
    v.literal('approved'),
    v.literal('queued'),
    v.literal('sent'),
    v.literal('replied'),
    v.literal('failed'),
  ),
  updatedAt: v.number(),
  latestActivityAt: v.number(),
  unreadReplyCount: v.number(),
  proposal: v.optional(
    v.object({
      recipient: v.string(),
      subject: v.string(),
      body: v.string(),
      instruction: v.string(),
      baseRevision: v.number(),
      createdAt: v.number(),
    }),
  ),
})

type DraftView = {
  _id: Id<'outreachDrafts'>
  candidateRef?: string
  candidateTitle: string
  recipient: string
  subject: string
  body: string
  revision: number
  state: Doc<'outreachDrafts'>['state']
  updatedAt: number
  latestActivityAt: number
  unreadReplyCount: number
  proposal?: NonNullable<Doc<'outreachDrafts'>['proposal']>
}

type NewOutreachDraft = Omit<Doc<'outreachDrafts'>, '_id' | '_creationTime'>

function draftView(draft: Doc<'outreachDrafts'>) {
  const view: DraftView = {
    _id: draft._id,
    candidateTitle: draft.candidateTitle,
    recipient: draft.recipient,
    subject: draft.subject,
    body: draft.body,
    revision: draft.revision,
    state: draft.state,
    updatedAt: draft.updatedAt,
    latestActivityAt: draft.latestActivityAt,
    unreadReplyCount: draft.unreadReplyCount,
  }
  if (draft.candidateRef) view.candidateRef = draft.candidateRef
  if (draft.proposal) view.proposal = draft.proposal
  return view
}

export async function ownedDraft(
  ctx: QueryCtx | MutationCtx,
  draftId: Id<'outreachDrafts'>,
  sessionId: SessionId,
): Promise<Doc<'outreachDrafts'>> {
  const draft = await ctx.db.get('outreachDrafts', draftId)
  if (!draft || draft.sessionId !== sessionId) {
    throw new ConvexError({ code: 'OUTREACH_DRAFT_NOT_FOUND' })
  }
  await assertThreadOwner(ctx, draft.threadId, sessionId)
  return draft
}

function editable(draft: Doc<'outreachDrafts'>): void {
  if (
    draft.state === 'queued' ||
    draft.state === 'sent' ||
    draft.state === 'replied'
  ) {
    throw new ConvexError({ code: 'OUTREACH_DRAFT_NOT_EDITABLE' })
  }
}

export const createFromAgent = internalMutation({
  args: {
    sessionId: vSessionId,
    threadId: v.string(),
    toolCallId: v.string(),
    candidateRef: v.optional(v.string()),
    candidateTitle: v.string(),
    recipient: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
  },
  returns: v.id('outreachDrafts'),
  handler: async (ctx, args) => {
    await assertThreadOwner(ctx, args.threadId, args.sessionId)
    const existing = await ctx.db
      .query('outreachDrafts')
      .withIndex('by_thread_and_tool_call', (index) =>
        index.eq('threadId', args.threadId).eq('toolCallId', args.toolCallId),
      )
      .unique()
    if (existing) return existing._id

    const now = Date.now()
    const newDraft: NewOutreachDraft = {
      sessionId: args.sessionId,
      threadId: args.threadId,
      toolCallId: args.toolCallId,
      candidateTitle: args.candidateTitle.trim(),
      recipient: normalizeOutreachRecipient(args.recipient ?? ''),
      subject: normalizeOutreachSubject(args.subject),
      body: args.body,
      revision: 1,
      lastAgentSeenRevision: 1,
      state: 'draft',
      updatedAt: now,
      latestActivityAt: now,
      unreadReplyCount: 0,
      agentHasUnreadReply: false,
    }
    if (args.candidateRef) newDraft.candidateRef = args.candidateRef
    return await ctx.db.insert('outreachDrafts', newDraft)
  },
})

export const get = query({
  args: { ...SessionIdArg, draftId: v.id('outreachDrafts') },
  returns: v.union(v.null(), vDraftView),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get('outreachDrafts', args.draftId)
    if (!draft || draft.sessionId !== args.sessionId) return null
    await assertThreadOwner(ctx, draft.threadId, args.sessionId)
    return draftView(draft)
  },
})

export const update = mutation({
  args: {
    ...SessionIdArg,
    draftId: v.id('outreachDrafts'),
    recipient: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId, args.sessionId)
    editable(draft)
    const recipient = normalizeOutreachRecipient(args.recipient)
    const subject = normalizeOutreachSubject(args.subject)
    if (
      recipient === draft.recipient &&
      subject === draft.subject &&
      args.body === draft.body
    ) {
      return draft.revision
    }
    if (subject.length > OUTREACH_SUBJECT_MAX_LENGTH) {
      throw new ConvexError({ code: 'OUTREACH_SUBJECT_TOO_LONG' })
    }
    if (args.body.length > OUTREACH_BODY_MAX_LENGTH) {
      throw new ConvexError({ code: 'OUTREACH_BODY_TOO_LONG' })
    }
    const revision = draft.revision + 1
    const now = Date.now()
    await ctx.db.patch('outreachDrafts', draft._id, {
      recipient,
      subject,
      body: args.body,
      revision,
      state: 'draft',
      updatedAt: now,
      latestActivityAt: now,
      approvedHash: undefined,
      approvedAt: undefined,
      proposal: undefined,
    })
    return revision
  },
})

export const approve = mutation({
  args: { ...SessionIdArg, draftId: v.id('outreachDrafts') },
  returns: v.string(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId, args.sessionId)
    editable(draft)
    const inboxId = env.AGENTMAIL_INBOX_ID
    if (!inboxId) {
      throw new ConvexError({ code: 'AGENTMAIL_INBOX_NOT_CONFIGURED' })
    }
    validateOutreachContent(draft)
    const approvedHash = await outreachContentHash({
      inboxId,
      recipient: draft.recipient,
      subject: draft.subject,
      body: draft.body,
    })
    const now = Date.now()
    await ctx.db.patch('outreachDrafts', draft._id, {
      approvedHash,
      approvedAt: now,
      state: 'approved',
      latestActivityAt: now,
    })
    return approvedHash
  },
})

export const setProposal = internalMutation({
  args: {
    draftId: v.id('outreachDrafts'),
    sessionId: vSessionId,
    baseRevision: v.number(),
    instruction: v.string(),
    recipient: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId, args.sessionId)
    editable(draft)
    if (draft.revision !== args.baseRevision) return false
    if (args.instruction.length > OUTREACH_INSTRUCTION_MAX_LENGTH) {
      throw new ConvexError({ code: 'OUTREACH_INSTRUCTION_TOO_LONG' })
    }
    await ctx.db.patch('outreachDrafts', draft._id, {
      proposal: {
        recipient: normalizeOutreachRecipient(args.recipient),
        subject: normalizeOutreachSubject(args.subject),
        body: args.body,
        instruction: args.instruction,
        baseRevision: args.baseRevision,
        createdAt: Date.now(),
      },
    })
    return true
  },
})

export const acceptProposal = mutation({
  args: { ...SessionIdArg, draftId: v.id('outreachDrafts') },
  returns: v.number(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId, args.sessionId)
    editable(draft)
    const proposal = draft.proposal
    if (!proposal || proposal.baseRevision !== draft.revision) {
      throw new ConvexError({ code: 'OUTREACH_PROPOSAL_STALE' })
    }
    const revision = draft.revision + 1
    const now = Date.now()
    await ctx.db.patch('outreachDrafts', draft._id, {
      recipient: proposal.recipient,
      subject: proposal.subject,
      body: proposal.body,
      revision,
      state: 'draft',
      updatedAt: now,
      latestActivityAt: now,
      approvedHash: undefined,
      approvedAt: undefined,
      proposal: undefined,
    })
    return revision
  },
})

export const discardProposal = mutation({
  args: { ...SessionIdArg, draftId: v.id('outreachDrafts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId, args.sessionId)
    editable(draft)
    await ctx.db.patch('outreachDrafts', draft._id, { proposal: undefined })
    return null
  },
})

export const getForAction = internalQuery({
  args: { draftId: v.id('outreachDrafts'), sessionId: vSessionId },
  returns: v.union(v.null(), vDraftView),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get('outreachDrafts', args.draftId)
    if (!draft || draft.sessionId !== args.sessionId) return null
    await assertThreadOwner(ctx, draft.threadId, args.sessionId)
    return draftView(draft)
  },
})
