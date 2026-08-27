import { describe, expect, it } from 'vitest'
import { asciiFieldStrength } from './asciiField'

describe('ASCII field grammar', () => {
  it('keeps the center of the converge material quiet', () => {
    const center = asciiFieldStrength('converge', 0, 0, 0)
    const edge = asciiFieldStrength('converge', 0.86, 0.12, 0)

    expect(center).toBe(0)
    expect(edge).toBeGreaterThan(0.35)
  })

  it('concentrates the margin material at the flanks', () => {
    const center = asciiFieldStrength('margin', 0, 0.2, 2)
    const flank = asciiFieldStrength('margin', -0.9, 0.2, 2)

    expect(center).toBe(0)
    expect(flank).toBeGreaterThan(0.35)
  })

  it('keeps the signal material locally bounded', () => {
    const center = asciiFieldStrength('signal', 0, 0, 1)
    const outside = asciiFieldStrength('signal', 1.4, 1.4, 1)

    expect(center).toBeGreaterThan(0.2)
    expect(outside).toBe(0)
  })

  it('anchors the flame at its ember bed and tapers above it', () => {
    const emberBed = asciiFieldStrength('flame', 0, 0.8, 8)
    const crown = Math.max(
      ...Array.from({ length: 41 }, (_, index) =>
        asciiFieldStrength('flame', index / 40 - 0.5, -0.52, 8),
      ),
    )
    const outside = asciiFieldStrength('flame', 0.9, -0.7, 8)

    expect(emberBed).toBeGreaterThan(0.6)
    expect(crown).toBeGreaterThan(0.25)
    expect(outside).toBe(0)
  })

  it('keeps the flame tip substantially narrower than its burning base', () => {
    const occupiedCellsAt = (y: number) =>
      Array.from({ length: 81 }, (_, index) => index / 40 - 1).filter(
        (x) => asciiFieldStrength('flame', x, y, 8) > 0.25,
      ).length

    const tipWidth = occupiedCellsAt(-0.64)
    const baseWidth = occupiedCellsAt(0.5)

    expect(tipWidth).toBeGreaterThan(0)
    expect(tipWidth).toBeLessThan(baseWidth * 0.55)
  })
})
