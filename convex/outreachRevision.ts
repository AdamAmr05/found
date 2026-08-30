import { createOpenAI } from '@ai-sdk/openai'
import { HOUR, RateLimiter } from '@convex-dev/rate-limiter'
import { generateObject } from 'ai'
import { ConvexError, v } from 'convex/values'
import { SessionIdArg } from 'convex-helpers/server/sessions'
import { z } from 'zod'

import {
  OUTREACH_BODY_MAX_LENGTH,
  OUTREACH_INSTRUCTION_MAX_LENGTH,
  OUTREACH_SUBJECT_MAX_LENGTH,
} from '../shared/foundTools'
import { components, internal } from './_generated/api'
import { action, env } from './_generated/server'
import { FOUND_MODEL } from './aiModel'

const revisedDraftSchema = z.object({
  recipient: z.string().max(254),
  subject: z.string().max(OUTREACH_SUBJECT_MAX_LENGTH),
  body: z.string().max(OUTREACH_BODY_MAX_LENGTH),
})

const REVISION_INSTRUCTIONS = `You revise one email draft for its author.
Apply only the requested changes. Preserve accurate details, intent, and the
author's voice. Do not invent recipient addresses or facts. Return the complete
recipient, subject, and body, including unchanged content.`

// Normal use never approaches this burst. It prevents a malformed client from
// launching the entire hourly paid-model allowance simultaneously.
const rateLimiter = new RateLimiter(components.rateLimiter, {
  reviseOutreachDraft: {
    kind: 'token bucket',
    rate: 200,
    period: HOUR,
    capacity: 20,
  },
})

export const request = action({
  args: {
    ...SessionIdArg,
    draftId: v.id('outreachDrafts'),
    instruction: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const instruction = args.instruction.trim()
    if (
      instruction.length === 0 ||
      instruction.length > OUTREACH_INSTRUCTION_MAX_LENGTH
    ) {
      throw new ConvexError({ code: 'OUTREACH_INSTRUCTION_INVALID' })
    }

    const requestId = crypto.randomUUID()
    const draft = await ctx.runMutation(internal.outreachDrafts.beginRevision, {
      sessionId: args.sessionId,
      draftId: args.draftId,
      requestId,
    })
    try {
      await rateLimiter.limit(ctx, 'reviseOutreachDraft', {
        key: args.sessionId,
        throws: true,
      })

      const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
      const result = await generateObject({
        model: openai(FOUND_MODEL),
        schema: revisedDraftSchema,
        system: REVISION_INSTRUCTIONS,
        prompt: JSON.stringify({
          currentDraft: {
            recipient: draft.recipient,
            subject: draft.subject,
            body: draft.body,
          },
          requestedChange: instruction,
        }),
      })

      const stored = await ctx.runMutation(
        internal.outreachDrafts.setProposal,
        {
          sessionId: args.sessionId,
          draftId: args.draftId,
          baseRevision: draft.revision,
          requestId,
          instruction,
          ...result.object,
        },
      )
      if (!stored) {
        throw new ConvexError({ code: 'OUTREACH_REVISION_SUPERSEDED' })
      }
    } catch (cause) {
      await ctx.runMutation(internal.outreachDrafts.clearRevision, {
        sessionId: args.sessionId,
        draftId: args.draftId,
        requestId,
      })
      throw cause
    }
    return null
  },
})
