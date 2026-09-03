import { ConvexError, type Infer, v } from 'convex/values'

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
  mutation,
  query,
} from './_generated/server'
import {
  normalizeOutreachRecipient,
  normalizeOutreachSubject,
  outreachContentHash,
  validateOutreachContent,
} from './outreachContent'
import { vOutreachProposal, vOutreachState } from './outreachModel'
import { humanUnreadReplyCount } from './outreachReplyState'
import { assertThreadOwner } from './threadAccess'
import { requireViewerId } from './viewer'

const REVISION_LEASE_MS = 5 * 60 * 1_000

const vDraftView = v.object({
  _id: v.id('outreachDrafts'),
  candidateRef: v.optional(v.string()),
  candidateTitle: v.string(),
  recipient: v.string(),
  subject: v.string(),
  body: v.string(),
  revision: v.number(),
  state: vOutreachState,
  updatedAt: v.number(),
  latestActivityAt: v.number(),
  unreadReplyCount: v.number(),
  proposal: v.optional(vOutreachProposal),
})

type DraftView = Infer<typeof vDraftView>

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
    unreadReplyCount: humanUnreadReplyCount(draft),
  }
  if (draft.candidateRef) view.candidateRef = draft.candidateRef
  if (draft.proposal) view.proposal = draft.proposal
  return view
}

export async function ownedDraft(
  ctx: QueryCtx | MutationCtx,
  draftId: Id<'outreachDrafts'>,
  userId: Id<'users'>,
): Promise<Doc<'outreachDrafts'>> {
  const draft = await ctx.db.get('outreachDrafts', draftId)
  if (!draft || draft.userId !== userId) {
    throw new ConvexError({ code: 'OUTREACH_DRAFT_NOT_FOUND' })
  }
  await assertThreadOwner(ctx, draft.threadId, userId)
  return draft
}

/** The draft a signed-in caller owns, for public functions. */
export async function viewerDraft(
  ctx: QueryCtx | MutationCtx,
  draftId: Id<'outreachDrafts'>,
): Promise<Doc<'outreachDrafts'>> {
  return await ownedDraft(ctx, draftId, await requireViewerId(ctx))
}

export function assertOutreachDraftEditable(
  draft: Pick<Doc<'outreachDrafts'>, 'state'>,
): void {
  if (
    draft.state === 'queued' ||
    draft.state === 'sent' ||
    draft.state === 'replied' ||
    draft.state === 'uncertain'
  ) {
    throw new ConvexError({ code: 'OUTREACH_DRAFT_NOT_EDITABLE' })
  }
}

function validateDraftLengths(subject: string, body: string): void {
  if (subject.length > OUTREACH_SUBJECT_MAX_LENGTH) {
    throw new ConvexError({ code: 'OUTREACH_SUBJECT_TOO_LONG' })
  }
  if (body.length > OUTREACH_BODY_MAX_LENGTH) {
    throw new ConvexError({ code: 'OUTREACH_BODY_TOO_LONG' })
  }
}

export const createFromAgent = internalMutation({
  args: {
    userId: v.id('users'),
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
    await assertThreadOwner(ctx, args.threadId, args.userId)
    const existing = await ctx.db
      .query('outreachDrafts')
      .withIndex('by_thread_and_tool_call', (index) =>
        index.eq('threadId', args.threadId).eq('toolCallId', args.toolCallId),
      )
      .unique()
    if (existing) return existing._id

    const subject = normalizeOutreachSubject(args.subject)
    validateDraftLengths(subject, args.body)
    const now = Date.now()
    const newDraft: NewOutreachDraft = {
      userId: args.userId,
      threadId: args.threadId,
      toolCallId: args.toolCallId,
      candidateTitle: args.candidateTitle.trim(),
      recipient: normalizeOutreachRecipient(args.recipient ?? ''),
      subject,
      body: args.body,
      revision: 1,
      lastAgentSeenRevision: 1,
      state: 'draft',
      updatedAt: now,
      latestActivityAt: now,
      replyRevision: 0,
      humanReadThroughReplyRevision: 0,
      agentReadThroughReplyRevision: 0,
    }
    if (args.candidateRef) newDraft.candidateRef = args.candidateRef
    return await ctx.db.insert('outreachDrafts', newDraft)
  },
})

export const get = query({
  args: { draftId: v.id('outreachDrafts') },
  returns: v.union(v.null(), vDraftView),
  handler: async (ctx, args) => {
    const userId = await requireViewerId(ctx)
    const draft = await ctx.db.get('outreachDrafts', args.draftId)
    if (!draft || draft.userId !== userId) return null
    await assertThreadOwner(ctx, draft.threadId, userId)
    return draftView(draft)
  },
})

export const update = mutation({
  args: {
    draftId: v.id('outreachDrafts'),
    recipient: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const draft = await viewerDraft(ctx, args.draftId)
    assertOutreachDraftEditable(draft)
    const recipient = normalizeOutreachRecipient(args.recipient)
    const subject = normalizeOutreachSubject(args.subject)
    if (
      recipient === draft.recipient &&
      subject === draft.subject &&
      args.body === draft.body
    ) {
      return draft.revision
    }
    validateDraftLengths(subject, args.body)
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
      revisionRequest: undefined,
    })
    return revision
  },
})

export const approve = mutation({
  args: { draftId: v.id('outreachDrafts') },
  returns: v.string(),
  handler: async (ctx, args) => {
    const draft = await viewerDraft(ctx, args.draftId)
    assertOutreachDraftEditable(draft)
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
      revisionRequest: undefined,
    })
    return approvedHash
  },
})

export const beginRevision = internalMutation({
  args: {
    draftId: v.id('outreachDrafts'),
    userId: v.id('users'),
    requestId: v.string(),
  },
  returns: v.object({
    recipient: v.string(),
    subject: v.string(),
    body: v.string(),
    revision: v.number(),
  }),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId, args.userId)
    assertOutreachDraftEditable(draft)
    const now = Date.now()
    if (
      draft.revisionRequest &&
      now - draft.revisionRequest.startedAt < REVISION_LEASE_MS
    ) {
      throw new ConvexError({ code: 'OUTREACH_REVISION_IN_PROGRESS' })
    }
    await ctx.db.patch('outreachDrafts', draft._id, {
      revisionRequest: {
        requestId: args.requestId,
        baseRevision: draft.revision,
        startedAt: now,
      },
    })
    return {
      recipient: draft.recipient,
      subject: draft.subject,
      body: draft.body,
      revision: draft.revision,
    }
  },
})

export const clearRevision = internalMutation({
  args: {
    draftId: v.id('outreachDrafts'),
    userId: v.id('users'),
    requestId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId, args.userId)
    if (draft.revisionRequest?.requestId === args.requestId) {
      await ctx.db.patch('outreachDrafts', draft._id, {
        revisionRequest: undefined,
      })
    }
    return null
  },
})

export const setProposal = internalMutation({
  args: {
    draftId: v.id('outreachDrafts'),
    userId: v.id('users'),
    baseRevision: v.number(),
    requestId: v.string(),
    instruction: v.string(),
    recipient: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const draft = await ownedDraft(ctx, args.draftId, args.userId)
    assertOutreachDraftEditable(draft)
    if (
      draft.revision !== args.baseRevision ||
      draft.revisionRequest?.requestId !== args.requestId ||
      draft.revisionRequest.baseRevision !== args.baseRevision
    ) {
      return false
    }
    if (args.instruction.length > OUTREACH_INSTRUCTION_MAX_LENGTH) {
      throw new ConvexError({ code: 'OUTREACH_INSTRUCTION_TOO_LONG' })
    }
    const subject = normalizeOutreachSubject(args.subject)
    validateDraftLengths(subject, args.body)
    await ctx.db.patch('outreachDrafts', draft._id, {
      proposal: {
        recipient: normalizeOutreachRecipient(args.recipient),
        subject,
        body: args.body,
        instruction: args.instruction,
        baseRevision: args.baseRevision,
        createdAt: Date.now(),
      },
      revisionRequest: undefined,
    })
    return true
  },
})

export const acceptProposal = mutation({
  args: { draftId: v.id('outreachDrafts') },
  returns: v.number(),
  handler: async (ctx, args) => {
    const draft = await viewerDraft(ctx, args.draftId)
    assertOutreachDraftEditable(draft)
    const proposal = draft.proposal
    if (!proposal || proposal.baseRevision !== draft.revision) {
      throw new ConvexError({ code: 'OUTREACH_PROPOSAL_STALE' })
    }
    validateDraftLengths(proposal.subject, proposal.body)
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
      revisionRequest: undefined,
    })
    return revision
  },
})

export const discardProposal = mutation({
  args: { draftId: v.id('outreachDrafts') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await viewerDraft(ctx, args.draftId)
    assertOutreachDraftEditable(draft)
    await ctx.db.patch('outreachDrafts', draft._id, { proposal: undefined })
    return null
  },
})
