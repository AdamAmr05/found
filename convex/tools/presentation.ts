import { createTool } from '@convex-dev/agent'

import {
  showCandidatesInputSchema,
  showCandidatesOutputSchema,
} from '../../shared/foundTools'

export const showCandidates = createTool({
  description: [
    'Present one to twelve accommodation candidates as a structured historical snapshot.',
    'Call this after researching useful candidates and grounding their claims in sources.',
    'The UI chooses Cards for one or two candidates and Fold for larger result sets.',
    'Do not invent missing facts. Omit unknown values or mark evidence unresolved.',
  ].join(' '),
  inputSchema: showCandidatesInputSchema,
  outputSchema: showCandidatesOutputSchema,
  execute: async (_ctx, input) => ({ presented: input.candidates.length }),
})
