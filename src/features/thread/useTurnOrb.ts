import { useState } from 'react'
import type { OrbState } from 'thinking-orbs'

const orbStates = [
  'working',
  'searching',
  'solving',
  'listening',
  'connecting',
  'weaving',
  'composing',
  'breathing',
  'shaping',
] as const satisfies readonly OrbState[]

export function orbForTurn(
  seed: number,
  turnKey: string,
  previous?: OrbState,
): OrbState {
  let hash = seed
  for (const character of turnKey)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619)
  const choices = orbStates.filter((orb) => orb !== previous)
  return choices[(hash >>> 0) % choices.length] ?? 'working'
}

export function useTurnOrb(turnKey: string): OrbState {
  const [seed] = useState(() => Math.floor(Math.random() * 0x100000000))
  const [selection, setSelection] = useState(() => ({
    turnKey,
    orb: orbForTurn(seed, turnKey),
  }))
  // Store the choice at the turn boundary, not at tool updates or indicator
  // mounts. Excluding the previous choice prevents adjacent turns repeating.
  if (selection.turnKey !== turnKey) {
    const next = { turnKey, orb: orbForTurn(seed, turnKey, selection.orb) }
    setSelection(next)
    return next.orb
  }
  return selection.orb
}
