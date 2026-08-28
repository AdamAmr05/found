import { createTool } from '@convex-dev/agent'
import { ConvexError } from 'convex/values'
import type { SessionId } from 'convex-helpers/server/sessions'

import { showCandidatesInputSchema } from '../../shared/foundTools'
import { internal } from '../_generated/api'

export const showCandidates = createTool({
  description: [
    'Present one to twelve accommodation candidates as a structured historical snapshot.',
    'Call this after researching useful candidates and grounding their claims in sources.',
    'The UI chooses Cards for one or two candidates and Fold for larger result sets.',
    'Do not invent missing facts. Omit unknown values or mark evidence unresolved.',
  ].join(' '),
  inputSchema: showCandidatesInputSchema,
  outputSchema: showCandidatesInputSchema,
  execute: async (ctx, input, options) => {
    if (!ctx.threadId || !ctx.userId) {
      throw new ConvexError({ code: 'CANDIDATE_PART_CONTEXT_MISSING' })
    }
    // SAFETY: Found starts every agent run with its validated SessionId as userId.
    const sessionId = ctx.userId as SessionId

    await ctx.runMutation(internal.candidateParts.record, {
      candidateRefs: input.candidates.map((candidate) => candidate.ref),
      sessionId,
      threadId: ctx.threadId,
      toolCallId: options.toolCallId,
    })

    return input
  },
})
