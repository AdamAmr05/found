import { Agent } from '@convex-dev/agent'
import { createOpenAI } from '@ai-sdk/openai'
import { isStepCount } from 'ai'

import { components } from './_generated/api'
import { env } from './_generated/server'
import { FOUND_BASE_INSTRUCTIONS } from './agentInstructions'
import { showCandidates } from './tools/presentation'
import { readPage, searchWeb } from './tools/research'

export const FOUND_MODEL = 'gpt-5.6-luna' as const

const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })

export const foundAgent = new Agent(components.agent, {
  name: 'Found',
  languageModel: openai(FOUND_MODEL),
  instructions: FOUND_BASE_INSTRUCTIONS,
  tools: { readPage, searchWeb, showCandidates },
  stopWhen: isStepCount(10),
})
