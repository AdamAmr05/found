import { Agent } from '@convex-dev/agent'
import { createOpenAI } from '@ai-sdk/openai'
import { isStepCount } from 'ai'

import { components } from './_generated/api'
import { env } from './_generated/server'
import { FOUND_MODEL } from './aiModel'
import { FOUND_BASE_INSTRUCTIONS } from './agentInstructions'
import {
  computeRoutes,
  lookupWeather,
  resolvePlaces,
  searchPlaces,
} from './tools/maps'
import { showCandidates, showMap } from './tools/presentation'
import { showOutreachDraft } from './tools/outreach'
import {
  listOutreachUpdates,
  readOutreachThread,
} from './tools/outreachMailbox'
import { readPage, searchWeb } from './tools/research'

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })

export const foundAgent = new Agent(components.agent, {
  name: 'Found',
  languageModel: openai(FOUND_MODEL),
  instructions: FOUND_BASE_INSTRUCTIONS,
  tools: {
    readPage,
    searchWeb,
    showCandidates,
    showMap,
    showOutreachDraft,
    listOutreachUpdates,
    readOutreachThread,
    searchPlaces,
    computeRoutes,
    lookupWeather,
    resolvePlaces,
  },
  stopWhen: isStepCount(16),
})
