import { describe, expect, it } from 'vitest'

import { changedSpan } from './outreachDiff'

describe('changedSpan', () => {
  it('isolates the revised middle while preserving shared context', () => {
    expect(changedSpan('Hello, Adam', 'Hello there, Adam')).toEqual({
      before: 'Hello',
      changed: ' there',
      after: ', Adam',
    })
  })

  it('returns no highlight for unchanged text', () => {
    expect(changedSpan('Same', 'Same')).toEqual({
      before: 'Same',
      changed: '',
      after: '',
    })
  })
})
