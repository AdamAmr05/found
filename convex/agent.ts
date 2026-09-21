import { Agent, hasSuccessfulToolCall } from '@convex-dev/agent'
import { createOpenAI } from '@ai-sdk/openai'
import { isStepCount } from 'ai'

import { components } from './_generated/api'
import { env } from './_generated/server'
import { FOUND_MODEL } from './aiModel'
import { FOUND_BASE_INSTRUCTIONS } from './agentInstructions'
import { askQuestions } from './tools/askQuestions'
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
    askQuestions,
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
  // A valid questionnaire ends the turn; invalid arguments go back to the
  // agent for correction before the user is asked anything.
  stopWhen: [isStepCount(16), hasSuccessfulToolCall('askQuestions')],
})
