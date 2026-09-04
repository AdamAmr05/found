import { expect, test } from 'vitest'
import type { OrbState } from 'thinking-orbs'
import { orbForTurn } from './useTurnOrb'

test('a turn choice is reproducible and each following turn excludes its predecessor', () => {
  for (const seed of [0, 42, 0xffffffff]) {
    let previous: OrbState | undefined
    for (let turn = 0; turn < 20; turn++) {
      const key = `user-${turn}`
      const orb = orbForTurn(seed, key, previous)
      expect(orbForTurn(seed, key, previous)).toBe(orb)
      expect(orb).not.toBe(previous)
      previous = orb
    }
  }
})
