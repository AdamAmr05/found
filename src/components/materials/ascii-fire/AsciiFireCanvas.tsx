import { useEffect, useRef } from 'react'
import frames from './frames.json'

const FRAME_INTERVAL = 85
const FONT = '8px "Geist Mono Variable", monospace'

/** Plays the ASCII fire frames without involving React in the draw loop. */
export function AsciiFireCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    let index = 0
    let timer: number | undefined
    let visible = false
    let disposed = false
    let width = 0

    const draw = () => {
      context.clearRect(0, 0, width, 240)
      context.font = FONT
      // The ASCII material uses sRGB, independently of P3 surface tokens.
      context.fillStyle = '#FA5D19'
      context.textBaseline = 'top'
      const frame = frames[index]
      if (!frame) return
      for (const [row, line] of frame.split('\n').entries()) {
        context.fillText(line, 0, row * 10)
      }
    }
    const stop = () => {
      window.clearInterval(timer)
      timer = undefined
    }
    const update = () => {
      stop()
      if (preference.matches) index = 22
      draw()
      if (!visible || document.hidden || preference.matches) return
      timer = window.setInterval(() => {
        index = (index + 1) % frames.length
        draw()
      }, FRAME_INTERVAL)
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false
        update()
      },
      { threshold: 0.01 },
    )

    void document.fonts.load(FONT).then(() => {
      if (disposed) return
      context.font = FONT
      width = 145 * context.measureText('X').width
      const ratio = Math.min(devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = 240 * ratio
      canvas.style.width = `${width}px`
      canvas.style.height = '240px'
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      observer.observe(canvas)
      update()
    })
    document.addEventListener('visibilitychange', update)
    preference.addEventListener('change', update)
    return () => {
      disposed = true
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
      preference.removeEventListener('change', update)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="block" />
}
