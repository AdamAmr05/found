export type AsciiAtmosphereDensity = 'quiet' | 'balanced' | 'rich'

export type AsciiAtmosphereVariant = 'converge' | 'flame' | 'margin' | 'signal'

export interface AsciiFrame {
  readonly width: number
  readonly height: number
  readonly frameIndex: number
  readonly seed: number
  readonly density: AsciiAtmosphereDensity
  readonly variant: AsciiAtmosphereVariant
  readonly color: string
  readonly opacity: number
}

export const ASCII_FRAME_COUNT = 36
export const ASCII_FRAME_INTERVAL = 85

const GLYPHS = ['.', ':', '-', '=', '+', 'X'] as const
const FLAME_GLYPHS = ['.', ':', '^', '/', '\\', '+', 'X'] as const
const CELL_WIDTH = 8
const CELL_HEIGHT = 10
const TAU = Math.PI * 2

const densityMultiplier = {
  balanced: 0.76,
  quiet: 0.54,
  rich: 0.96,
} as const satisfies Readonly<Record<AsciiAtmosphereDensity, number>>

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function smoothstep(edge0: number, edge1: number, value: number): number {
  const amount = clamp((value - edge0) / (edge1 - edge0))
  return amount * amount * (3 - 2 * amount)
}

function hash(x: number, y: number, seed: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43_758.5453
  return value - Math.floor(value)
}

function blob(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
): number {
  const distance = Math.hypot((x - centerX) / radiusX, (y - centerY) / radiusY)

  return 1 - smoothstep(0.68, 1.08, distance)
}

function ridge(y: number, center: number, width: number): number {
  return 1 - smoothstep(width * 0.42, width, Math.abs(y - center))
}

function framePhase(frameIndex: number): number {
  const normalizedIndex =
    ((frameIndex % ASCII_FRAME_COUNT) + ASCII_FRAME_COUNT) % ASCII_FRAME_COUNT

  return normalizedIndex / ASCII_FRAME_COUNT
}

function convergeStrength(x: number, y: number, frameIndex: number): number {
  const phase = framePhase(frameIndex)
  const oscillation = Math.sin(phase * TAU)
  const breath = (1 - Math.cos(phase * TAU)) / 2
  const shoulderY = 0.02 + oscillation * 0.13
  const shoulderInset = breath * 0.1
  const leftShoulder = Math.max(
    blob(x, y, -0.78 + shoulderInset, shoulderY - 0.2, 0.3, 0.3),
    blob(x, y, -0.66 + shoulderInset, shoulderY + 0.18, 0.42, 0.28),
  )
  const rightShoulder = Math.max(
    blob(x, y, 0.78 - shoulderInset, shoulderY - 0.18, 0.3, 0.32),
    blob(x, y, 0.66 - shoulderInset, shoulderY + 0.2, 0.42, 0.28),
  )
  const bridgeY = 0.55 - breath * 0.12 + Math.sin(x * 4 + phase * TAU) * 0.05
  const bridge = ridge(y, bridgeY, 0.15) * smoothstep(0.2, 0.42, Math.abs(x))
  const quietCenter = smoothstep(
    0.46,
    0.92,
    Math.hypot(x / 0.82, (y + 0.05) / 0.64),
  )

  return clamp(Math.max(leftShoulder, rightShoulder, bridge) * quietCenter)
}

function marginStrength(x: number, y: number, frameIndex: number): number {
  const phase = framePhase(frameIndex)
  const direction = x < 0 ? 1 : -1
  const edge = smoothstep(0.32, 0.62, Math.abs(x))
  const waveCenter =
    -0.42 + ((phase + Math.abs(x) * 0.22) % 1) * 0.92 * direction
  const primary = ridge(y, waveCenter, 0.22)
  const secondary = ridge(
    y,
    -waveCenter * 0.72 + Math.sin(phase * TAU) * 0.08,
    0.15,
  )
  const pocket = blob(
    x,
    y,
    x < 0 ? -0.72 : 0.72,
    Math.cos(phase * TAU) * 0.2,
    0.34,
    0.52,
  )

  return clamp(edge * Math.max(primary, secondary * 0.76, pocket * 0.86))
}

function signalStrength(x: number, y: number, frameIndex: number): number {
  const phase = framePhase(frameIndex)
  const pulse = (1 - Math.cos(phase * TAU)) / 2
  const centerX = Math.sin(phase * TAU) * 0.12
  const centerY = Math.cos(phase * TAU) * 0.08
  const distance = Math.hypot(x - centerX, y - centerY)
  const ringRadius = 0.2 + pulse * 0.38
  const ring = 1 - smoothstep(0.05, 0.18, Math.abs(distance - ringRadius))
  const core = blob(x, y, centerX, centerY, 0.28 + pulse * 0.1, 0.22)
  const satellite = blob(
    x,
    y,
    -0.42 + pulse * 0.84,
    0.28 - pulse * 0.56,
    0.2,
    0.18,
  )

  return clamp(Math.max(ring * 0.92, core, satellite * 0.88))
}

interface FlameTongueProfile {
  readonly baseWidth: number
  readonly baseX: number
  readonly bottomY: number
  readonly frequency: number
  readonly lean: number
  readonly phaseOffset: number
  readonly sway: number
  readonly topY: number
}

function flameTongueStrength(
  x: number,
  y: number,
  phase: number,
  tongue: FlameTongueProfile,
): number {
  const progress = clamp((y - tongue.topY) / (tongue.bottomY - tongue.topY))
  const tipFreedom = (1 - progress) ** 1.35
  const center =
    tongue.baseX +
    (tongue.lean +
      Math.sin(
        phase * TAU * tongue.frequency +
          tongue.phaseOffset +
          progress * Math.PI * 1.4,
      ) *
        tongue.sway) *
      tipFreedom
  const halfWidth = 0.024 + tongue.baseWidth * progress ** 0.76
  const sideProfile =
    1 - smoothstep(halfWidth * 0.7, halfWidth, Math.abs(x - center))
  const verticalProfile =
    smoothstep(tongue.topY, tongue.topY + 0.1, y) *
    (1 - smoothstep(tongue.bottomY - 0.08, tongue.bottomY, y))

  return sideProfile * verticalProfile
}

function flameStrength(x: number, y: number, frameIndex: number): number {
  const phase = framePhase(frameIndex)
  const centerTongue = flameTongueStrength(x, y, phase, {
    baseWidth: 0.42,
    baseX: 0,
    bottomY: 0.86,
    frequency: 1,
    lean: 0.13,
    phaseOffset: 0,
    sway: 0.07,
    topY: -0.86,
  })
  const leftTongue = flameTongueStrength(x, y, phase, {
    baseWidth: 0.2,
    baseX: -0.27,
    bottomY: 0.86,
    frequency: 1.35,
    lean: -0.05,
    phaseOffset: 1.2,
    sway: 0.045,
    topY: -0.16,
  })
  const rightTongue = flameTongueStrength(x, y, phase, {
    baseWidth: 0.21,
    baseX: 0.27,
    bottomY: 0.86,
    frequency: 1.2,
    lean: 0.05,
    phaseOffset: 3.4,
    sway: 0.045,
    topY: -0.29,
  })
  const leftNotch = blob(
    x,
    y,
    -0.17 + Math.sin(phase * TAU + 0.7) * 0.025,
    -0.18,
    0.055,
    0.25,
  )
  const rightNotch = blob(
    x,
    y,
    0.17 + Math.sin(phase * TAU + 2.8) * 0.025,
    -0.13,
    0.055,
    0.23,
  )
  const tongues = Math.max(centerTongue, leftTongue, rightTongue)
  const carvedTongues = tongues * (1 - Math.max(leftNotch, rightNotch) * 0.96)
  const emberBed =
    ridge(y, 0.8 + Math.sin(x * 8 + phase * TAU) * 0.025, 0.1) *
    (1 - smoothstep(0.46, 0.62, Math.abs(x)))

  return clamp(Math.max(carvedTongues, emberBed))
}

export function asciiFieldStrength(
  variant: AsciiAtmosphereVariant,
  x: number,
  y: number,
  frameIndex: number,
): number {
  if (variant === 'flame') return flameStrength(x, y, frameIndex)
  if (variant === 'margin') return marginStrength(x, y, frameIndex)
  if (variant === 'signal') return signalStrength(x, y, frameIndex)
  return convergeStrength(x, y, frameIndex)
}

function glyphFor(strength: number, random: number): (typeof GLYPHS)[number] {
  const index = Math.min(
    GLYPHS.length - 1,
    Math.floor(strength * (GLYPHS.length - 1) + random * 1.15),
  )

  return GLYPHS[index] ?? '.'
}

function flameGlyphFor(
  x: number,
  strength: number,
  random: number,
): (typeof FLAME_GLYPHS)[number] {
  if (strength < 0.42) return random > 0.5 ? '.' : ':'
  if (strength < 0.7) return x < 0 ? '/' : '\\'

  const index = Math.min(
    FLAME_GLYPHS.length - 1,
    Math.floor(strength * (FLAME_GLYPHS.length - 1) + random),
  )

  return FLAME_GLYPHS[index] ?? '^'
}

function drawCell(
  context: CanvasRenderingContext2D,
  frame: AsciiFrame,
  column: number,
  row: number,
): void {
  const x = column * CELL_WIDTH + CELL_WIDTH / 2
  const y = row * CELL_HEIGHT + CELL_HEIGHT / 2
  const normalizedX = (x / frame.width) * 2 - 1
  const normalizedY = (y / frame.height) * 2 - 1
  const strength = asciiFieldStrength(
    frame.variant,
    normalizedX,
    normalizedY,
    frame.frameIndex,
  )
  const random = hash(column, row, frame.seed)
  const occupancy = strength * densityMultiplier[frame.density]

  if (random > occupancy || strength < 0.04) return

  const glyphRandom = hash(row, column, frame.seed + 11)
  const glyph =
    frame.variant === 'flame'
      ? flameGlyphFor(normalizedX, strength, glyphRandom)
      : glyphFor(strength, glyphRandom)

  context.globalAlpha = frame.opacity
  context.fillText(glyph, x, y)
}

export function drawAsciiFrame(
  context: CanvasRenderingContext2D,
  frame: AsciiFrame,
): void {
  context.clearRect(0, 0, frame.width, frame.height)
  context.fillStyle = frame.color
  context.font = '500 8px "Roboto Mono Variable", "Roboto Mono", monospace'
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  const columns = Math.ceil(frame.width / CELL_WIDTH)
  const rows = Math.ceil(frame.height / CELL_HEIGHT)

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      drawCell(context, frame, column, row)
    }
  }

  context.globalAlpha = 1
}
