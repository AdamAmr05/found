import type { Transition } from 'motion/react'

/**
 * One motion vocabulary for the lab. Named by intent so a component picks a
 * behaviour rather than tuning numbers locally.
 */

/** Direct manipulation and pressed states: arrives fast, does not overshoot. */
export const snapTransition: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 42,
  mass: 0.7,
}

/** Layout and resolution changes: the object should look like it has weight. */
export const settleTransition: Transition = {
  type: 'spring',
  stiffness: 340,
  damping: 36,
}

/** Release from a gesture: carries velocity without feeling loose. */
export const releaseTransition: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 28,
}

/** Content swaps where a spring would read as bounce rather than change. */
export const revealEase: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const revealTransition: Transition = {
  duration: 0.24,
  ease: revealEase,
}

/**
 * Reduced motion removes travel and blur, never the state change itself.
 * `useReducedMotion` returns null before the media query resolves.
 */
export function travel(prefersReducedMotion: boolean | null, distance: number) {
  return prefersReducedMotion === true ? 0 : distance
}
