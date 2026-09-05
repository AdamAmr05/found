import { useEffect, useRef } from 'react'
import {
  ASCII_FRAME_COUNT,
  ASCII_FRAME_INTERVAL,
  drawAsciiFrame,
  type AsciiAtmosphereDensity,
  type AsciiAtmosphereVariant,
} from './asciiField'

interface AsciiAtmosphereProps {
  readonly className?: string
  readonly color?: string
  readonly density?: AsciiAtmosphereDensity
  readonly opacity?: number
  readonly seed?: number
  readonly variant?: AsciiAtmosphereVariant
}

const MAX_PIXEL_RATIO = 1.75
const REDUCED_MOTION_FRAME = 22

export function AsciiAtmosphere({
  className = '',
  color = '#FA5D19',
  density = 'balanced',
  opacity = 1,
  seed = 17,
  variant = 'converge',
}: AsciiAtmosphereProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!root || !canvas || !context) return

    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )
    let cssWidth = 1
    let cssHeight = 1
    let frameIndex = 0
    let intervalId: number | undefined
    let inView = false
    let disposed = false

    const draw = (index: number): void => {
      drawAsciiFrame(context, {
        color,
        density,
        frameIndex: index,
        height: cssHeight,
        opacity,
        seed,
        variant,
        width: cssWidth,
      })
    }

    const stop = (): void => {
      if (intervalId === undefined) return
      window.clearInterval(intervalId)
      intervalId = undefined
    }

    const start = (): void => {
      stop()

      if (motionPreference.matches) {
        draw(REDUCED_MOTION_FRAME)
        return
      }

      draw(frameIndex)
      intervalId = window.setInterval(() => {
        frameIndex = (frameIndex + 1) % ASCII_FRAME_COUNT
        draw(frameIndex)
      }, ASCII_FRAME_INTERVAL)
    }

    const updateActivity = (): void => {
      if (inView && !document.hidden) start()
      else stop()
    }

    const resize = (): void => {
      const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO)
      // Layout projection can temporarily scale the media to thumbnail size.
      // Measure layout pixels so that transform cannot shrink the bitmap.
      cssWidth = Math.max(1, root.clientWidth)
      cssHeight = Math.max(1, root.clientHeight)
      canvas.width = Math.round(cssWidth * pixelRatio)
      canvas.height = Math.round(cssHeight * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      draw(motionPreference.matches ? REDUCED_MOTION_FRAME : frameIndex)
    }

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        inView = entry?.isIntersecting ?? false
        updateActivity()
      },
      { rootMargin: '200px' },
    )
    const resizeObserver = new ResizeObserver(resize)
    const handleVisibilityChange = (): void => updateActivity()
    const handleMotionChange = (): void => updateActivity()

    visibilityObserver.observe(root)
    resizeObserver.observe(root)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    motionPreference.addEventListener('change', handleMotionChange)

    resize()
    void document.fonts.ready.then(() => {
      if (!disposed)
        draw(motionPreference.matches ? REDUCED_MOTION_FRAME : frameIndex)
    })

    return () => {
      disposed = true
      stop()
      visibilityObserver.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      motionPreference.removeEventListener('change', handleMotionChange)
    }
  }, [color, density, opacity, seed, variant])

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      data-ascii-atmosphere={variant}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  )
}
