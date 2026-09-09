import { useEffect, useRef } from 'react'
import { createAtmosphereRenderer } from './createAtmosphereRenderer'

export function HeroAtmosphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const shader = createAtmosphereRenderer(canvas)
    if (!shader) return
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let visible = false
    let elapsed = 12
    let last = 0
    let x = 0.5
    let y = 0.5
    let targetX = 0.5
    let targetY = 0.5
    let intensity = 0
    let target = 0
    const draw = () => shader.draw(elapsed, x, y, intensity)
    const tick = (now: number) => {
      elapsed += Math.min((now - last) / 1000, 0.05) * 0.35
      const ease = 1 - Math.exp(-Math.min(now - last, 50) / 140)
      x += (targetX - x) * ease
      y += (targetY - y) * ease
      intensity += (target - intensity) * ease
      last = now
      draw()
      frame = requestAnimationFrame(tick)
    }
    const update = () => {
      cancelAnimationFrame(frame)
      intensity = 0
      draw()
      if (!motion.matches && visible && !document.hidden) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }
    const resize = new ResizeObserver(() => {
      const ratio = Math.min(devicePixelRatio, 1.5)
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio))
      draw()
    })
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? false
      update()
    })
    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      targetX = (event.clientX - rect.left) / rect.width
      targetY = 1 - (event.clientY - rect.top) / rect.height
      target = Number(
        targetX >= 0 && targetX <= 1 && targetY >= 0 && targetY <= 1,
      )
    }
    const leave = () => {
      target = 0
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('blur', leave)
    document.addEventListener('pointerleave', leave)
    resize.observe(canvas)
    intersection.observe(canvas)
    motion.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      intersection.disconnect()
      motion.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('blur', leave)
      document.removeEventListener('pointerleave', leave)
      shader.dispose()
    }
  }, [])
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 size-full"
    />
  )
}
