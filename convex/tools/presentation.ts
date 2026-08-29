import { createTool } from '@convex-dev/agent'

import {
  showCandidatesInputSchema,
  showCandidatesOutputSchema,
} from '../../shared/foundTools'
import {
  showMapInputSchema,
  showMapOutputSchema,
} from '../../shared/googleMaps'

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

export const showMap = createTool({
  description: [
    'Present an interactive Google Maps scene inline: an immersive map with labeled markers, optionally one computed route and rich place-detail cards.',
    'Call this after grounding the scene: marker coordinates must come from your Maps tools or candidate sources, and the route must be one you actually computed.',
    'Use markers for candidates and nearby places, route for a commute the user cares about, and placeCards for up to four Google place IDs worth inspecting closely.',
    'Set camera mode satellite with a tilt around 60 for an immersive view of a specific location, and roadmap for orientation across an area.',
    'When a marker represents a candidate presented in this response, set its candidateRef to that candidate ref.',
  ].join(' '),
  inputSchema: showMapInputSchema,
  outputSchema: showMapOutputSchema,
  execute: async () => ({ presented: true as const }),
})
