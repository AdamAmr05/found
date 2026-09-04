import type { ToolUIPart } from 'ai'

import type { FoundUIMessage } from './ThreadMessage'
import { isToolActive, type FoundThreadTools } from './toolState'

export type ActivityPart = ToolUIPart<FoundThreadTools>

const activityLabels = {
  'tool-searchWeb': [
    'Searching the web',
    'Searched the web',
    'Search unavailable',
  ],
  'tool-readPage': ['Reading sources', 'Read sources', 'Source unavailable'],
  'tool-resolvePlaces': [
    'Locating addresses',
    'Located addresses',
    'Address lookup unavailable',
  ],
  'tool-searchPlaces': [
    'Exploring nearby places',
    'Explored nearby places',
    'Nearby search unavailable',
  ],
  'tool-computeRoutes': [
    'Checking the journey',
    'Checked the journey',
    'Route unavailable',
  ],
  'tool-lookupWeather': [
    'Checking the weather',
    'Checked the weather',
    'Weather unavailable',
  ],
  'tool-showCandidates': [
    'Preparing options',
    'Prepared options',
    'Options unavailable',
  ],
  'tool-showMap': ['Preparing the map', 'Prepared the map', 'Map unavailable'],
  'tool-showOutreachDraft': [
    'Preparing an email',
    'Prepared an email',
    'Email unavailable',
  ],
  'tool-listOutreachUpdates': [
    'Checking email updates',
    'Checked email updates',
    'Email updates unavailable',
  ],
  'tool-readOutreachThread': [
    'Reading the email thread',
    'Read the email thread',
    'Email thread unavailable',
  ],
} satisfies Record<ActivityPart['type'], readonly [string, string, string]>

export type ThreadTurn = {
  key: string
  messages: FoundUIMessage[]
}

// A turn can contain several Agent messages. Its activity follows the user
// request, rather than starting a separate disclosure for every model step.
export function threadTurns(messages: readonly FoundUIMessage[]): ThreadTurn[] {
  const turns: ThreadTurn[] = []
  for (const message of messages) {
    if (message.role === 'system') continue
    const previous = turns.at(-1)
    if (message.role === 'user' || !previous) {
      turns.push({ key: message.key, messages: [message] })
    } else {
      previous.messages.push(message)
    }
  }
  return turns
}

function isActivityPart(
  part: FoundUIMessage['parts'][number],
): part is ActivityPart {
  return 'toolCallId' in part && part.type !== 'dynamic-tool'
}

export function activityParts(
  messages: readonly FoundUIMessage[],
): ActivityPart[] {
  const parts = new Map<string, ActivityPart>()
  for (const message of messages) {
    if (message.role !== 'assistant') continue
    for (const part of message.parts) {
      if (isActivityPart(part)) parts.set(part.toolCallId, part)
    }
  }
  return [...parts.values()]
}

export type ActivityGroup = {
  key: string
  type: ActivityPart['type']
  state: 'active' | 'complete' | 'failed' | 'interrupted'
  label: string
  parts: ActivityPart[]
}

function describeActivity(
  part: ActivityPart,
  active: boolean,
): Pick<ActivityGroup, 'state' | 'label'> {
  const [running, complete, failed] = activityLabels[part.type]
  if (part.state === 'output-available')
    return { state: 'complete', label: complete }
  if (!isToolActive(part.state)) return { state: 'failed', label: failed }
  return active
    ? { state: 'active', label: running }
    : { state: 'interrupted', label: `${running} — not completed` }
}

export function groupActivity(
  parts: readonly ActivityPart[],
  active: boolean,
): ActivityGroup[] {
  const groups: ActivityGroup[] = []
  for (const part of parts) {
    const { state, label } = describeActivity(part, active)
    const previous = groups.at(-1)
    if (previous?.type === part.type && previous.state === state) {
      previous.parts.push(part)
    } else {
      groups.push({
        key: part.toolCallId,
        type: part.type,
        state,
        label,
        parts: [part],
      })
    }
  }
  return groups
}

export function currentActivity(
  parts: readonly ActivityPart[],
  hasResponse = false,
) {
  const current = parts.filter((part) => isToolActive(part.state)).at(-1)
  if (!current) return parts.length || hasResponse ? 'Working' : 'Thinking'
  return activityLabels[current.type][0]
}
