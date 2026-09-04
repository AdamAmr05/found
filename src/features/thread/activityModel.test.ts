import { describe, expect, test } from 'vitest'
import {
  completedReads,
  message,
  prompt,
  reads,
  searches,
} from '../../../tests/fixtures/activity-messages'
import {
  activityParts,
  currentActivity,
  groupActivity,
  threadTurns,
} from './activityModel'

describe('turn activity', () => {
  test('keeps model steps in one turn and separates the next user request', () => {
    const research = message('research', 'assistant', searches)
    const response = message('response', 'assistant', completedReads)
    const next = message('next-user', 'user', [])
    const turns = threadTurns([prompt, research, response, next])
    expect(turns.map((turn) => turn.messages.map((item) => item.key))).toEqual([
      [prompt.key, research.key, response.key],
      [next.key],
    ])
  })

  test('replaces repeated tool-call snapshots and preserves distinct calls', () => {
    const parts = activityParts([
      message('live', 'assistant', reads),
      message('stored', 'assistant', completedReads),
    ])
    expect(parts).toEqual(completedReads)
    expect(
      groupActivity([...searches, ...parts], false).map((group) => [
        group.label,
        group.parts.length,
      ]),
    ).toEqual([
      ['Searched the web', 4],
      ['Read sources', 4],
    ])
  })

  test('does not claim unfinished work succeeded or leave it animated in history', () => {
    expect(groupActivity(reads, false).map((group) => group.state)).toEqual([
      'interrupted',
    ])
    expect(groupActivity(reads, false)[0]?.label).toContain('not completed')
    expect(currentActivity(reads)).toBe('Reading sources')
    expect(currentActivity(completedReads)).toBe('Working')
    expect(currentActivity([], true)).toBe('Working')
  })
})
