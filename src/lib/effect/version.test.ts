import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

describe('Effect foundation', () => {
  it('runs an Effect v4 program', async () => {
    const result = await Effect.runPromise(Effect.succeed('ready'))

    expect(result).toBe('ready')
  })
})
