import { createTool } from '@convex-dev/agent'

import {
  askQuestionsInputSchema,
  askQuestionsOutputSchema,
} from '../../shared/foundTools'

/**
 * Turns the composer into a short form. The tool itself does nothing on the
 * server; the agent run stops after the call, and the answers arrive as the
 * user's next message in prose, one line per question.
 */
export const askQuestions = createTool({
  description: [
    'Ask the user up to six questions at once through the composer, when two or more independent unknowns block a useful search and each has a small set of likely answers.',
    'Compose the questions yourself. Choose the kind that fits the answer: choice for a short list of options (multiple when several can apply), number for a small count with a unit, amount for money, location for where, when for timing with a few worded options, and text for anything open.',
    'Every kind also gives the user a free-text field and voice, so keep options short and let the user say it their own way. Money and dates are free text; never fix a currency or demand a date format.',
    'Prefill anything the user already said and use the hint to say where it came from, so the question reads as a confirmation. Never ask for something the user has answered. Use required only when research cannot start without it.',
    'Say one short sentence before calling this, then end the turn. The answers arrive as the user’s next message as prose, one line per question; a skipped question says (skipped), and a typed answer may change what was asked.',
    'In almost every thread this is called at most once, before the first search. If one question would do, ask it in text instead.',
  ].join(' '),
  inputSchema: askQuestionsInputSchema,
  outputSchema: askQuestionsOutputSchema,
  execute: async (_ctx, input) => ({ asked: input.questions.length }),
})
