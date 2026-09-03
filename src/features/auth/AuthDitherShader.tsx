import './AuthDitherShader.css'

import { useEffect, useRef, type ReactNode } from 'react'

interface DitherTone {
  readonly r: number
  readonly g: number
  readonly b: number
}

interface AuthDitherShaderProps {
  readonly tone: DitherTone
}

interface ShaderUniforms {
  readonly viewport: WebGLUniformLocation
  readonly seconds: WebGLUniformLocation
  readonly pointer: WebGLUniformLocation
  readonly pointerMix: WebGLUniformLocation
  readonly ink: WebGLUniformLocation
}

interface ShaderSurface {
  readonly gl: WebGL2RenderingContext
  readonly program: WebGLProgram
  readonly vertexArray: WebGLVertexArrayObject
  readonly vertexBuffer: WebGLBuffer
  readonly uniforms: ShaderUniforms
}

interface PointerState {
  targetX: number
  targetY: number
  x: number
  y: number
  targetMix: number
  mix: number
}

const vertexSource = /* glsl */ `#version 300 es
  in vec2 aPosition;

  void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`

const fragmentSource = /* glsl */ `#version 300 es
  precision highp float;

  uniform vec2 uViewport;
  uniform float uSeconds;
  uniform vec2 uPointer;
  uniform float uPointerMix;
  uniform vec3 uInk;

  out vec4 outputColor;

  float cellThreshold(vec2 cell) {
    return fract(dot(cell, vec2(0.754877666, 0.569840296)));
  }

  float lineMask(vec2 point, vec2 start, vec2 end, float radius) {
    vec2 segment = end - start;
    float position = clamp(
      dot(point - start, segment) / dot(segment, segment),
      0.0,
      1.0
    );
    float distanceToLine = length(point - (start + segment * position));
    return 1.0 - smoothstep(radius, radius + 0.075, distanceToLine);
  }

  float glyph(vec2 point, float level) {
    float dotMark = 1.0 - smoothstep(0.11, 0.2, length(point));
    float dashMark = lineMask(point, vec2(-0.46, 0.0), vec2(0.46, 0.0), 0.1);
    float plusMark = max(
      lineMask(point, vec2(-0.52, 0.0), vec2(0.52, 0.0), 0.09),
      lineMask(point, vec2(0.0, -0.52), vec2(0.0, 0.52), 0.09)
    );
    float hashMark = max(
      max(
        lineMask(point, vec2(-0.5, -0.24), vec2(0.5, -0.24), 0.075),
        lineMask(point, vec2(-0.5, 0.24), vec2(0.5, 0.24), 0.075)
      ),
      max(
        lineMask(point, vec2(-0.24, -0.5), vec2(-0.24, 0.5), 0.075),
        lineMask(point, vec2(0.24, -0.5), vec2(0.24, 0.5), 0.075)
      )
    );

    float mark = mix(dotMark, dashMark, step(0.3, level));
    mark = mix(mark, plusMark, step(0.55, level));
    return mix(mark, hashMark, step(0.8, level)) * step(0.08, level);
  }

  mat2 rotation(float angle) {
    float sine = sin(angle);
    float cosine = cos(angle);
    return mat2(cosine, -sine, sine, cosine);
  }

  float wovenField(vec2 point, float phase) {
    vec4 travelingPhases = vec4(
      point.x * 4.85 + phase,
      point.y * 5.15 + phase * 1.04,
      point.x * point.y * 9.35 - phase * 0.96,
      length(point) * 9.65 - phase * 1.92
    );
    return dot(sin(travelingPhases), vec4(0.25)) + 0.5;
  }

  void main() {
    const float cellSize = 10.0;
    vec2 cell = floor(gl_FragCoord.xy / cellSize);
    vec2 cellPoint = fract(gl_FragCoord.xy / cellSize) * 2.0 - 1.0;
    vec2 position = ((cell + 0.5) * cellSize - uViewport * 0.5)
      / uViewport.y * 2.0;
    vec2 pointer = (uPointer - uViewport * 0.5) / uViewport.y * 2.0;

    vec2 offset = position - pointer;
    float pointerFalloff = exp(-dot(offset, offset) * 16.0) * uPointerMix;
    position = pointer + rotation(pointerFalloff * 0.72) * offset;
    position += normalize(offset + vec2(0.0001)) * pointerFalloff * 0.075;

    float phase = uSeconds * 0.48;
    float brightness = wovenField(position, phase);
    brightness = pow(smoothstep(0.16, 0.94, brightness), 0.78);
    brightness *= 1.0 - pointerFalloff * 0.84;
    brightness = clamp(
      brightness + (cellThreshold(cell) - 0.5) * 0.46,
      0.0,
      1.0
    );

    float level = floor(clamp(brightness, 0.0, 0.999) * 5.0) / 4.0;
    float mark = glyph(cellPoint, level);
    outputColor = vec4(uInk, mark);
  }
`

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  gl.deleteShader(shader)
  return null
}

function findUniforms(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
): ShaderUniforms | null {
  const viewport = gl.getUniformLocation(program, 'uViewport')
  const seconds = gl.getUniformLocation(program, 'uSeconds')
  const pointer = gl.getUniformLocation(program, 'uPointer')
  const pointerMix = gl.getUniformLocation(program, 'uPointerMix')
  const ink = gl.getUniformLocation(program, 'uInk')
  if (!viewport || !seconds || !pointer || !pointerMix || !ink) return null
  return { viewport, seconds, pointer, pointerMix, ink }
}

function createSurface(canvas: HTMLCanvasElement): ShaderSurface | null {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
    premultipliedAlpha: false,
  })
  if (!gl) return null

  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource)
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource)
  if (!vertex || !fragment) {
    if (vertex) gl.deleteShader(vertex)
    if (fragment) gl.deleteShader(fragment)
    return null
  }

  const program = gl.createProgram()
  if (!program) {
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    return null
  }

  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  gl.deleteShader(vertex)
  gl.deleteShader(fragment)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }

  const vertexArray = gl.createVertexArray()
  const vertexBuffer = gl.createBuffer()
  const uniforms = findUniforms(gl, program)
  const positionAttribute = gl.getAttribLocation(program, 'aPosition')
  if (!vertexArray || !vertexBuffer || !uniforms || positionAttribute < 0) {
    if (vertexArray) gl.deleteVertexArray(vertexArray)
    if (vertexBuffer) gl.deleteBuffer(vertexBuffer)
    gl.deleteProgram(program)
    return null
  }

  gl.useProgram(program)
  gl.bindVertexArray(vertexArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  )
  gl.enableVertexAttribArray(positionAttribute)
  gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 0, 0)
  gl.disable(gl.DEPTH_TEST)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
  gl.clearColor(0, 0, 0, 0)
  return { gl, program, vertexArray, vertexBuffer, uniforms }
}

function resizeCanvas(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext) {
  const density = Math.min(globalThis.devicePixelRatio || 1, 2)
  const width = Math.max(1, Math.round(canvas.clientWidth * density))
  const height = Math.max(1, Math.round(canvas.clientHeight * density))
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
  gl.viewport(0, 0, width, height)
}

function renderSurface(
  surface: ShaderSurface,
  state: PointerState,
  tone: DitherTone,
  seconds: number,
) {
  const { gl, uniforms } = surface
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.uniform2f(uniforms.viewport, gl.drawingBufferWidth, gl.drawingBufferHeight)
  gl.uniform1f(uniforms.seconds, seconds)
  gl.uniform2f(uniforms.pointer, state.x, state.y)
  gl.uniform1f(uniforms.pointerMix, state.mix)
  gl.uniform3f(uniforms.ink, tone.r, tone.g, tone.b)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
}

export function AuthDitherShader({ tone }: AuthDitherShaderProps): ReactNode {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const surface = createSurface(canvas)
    if (!surface) return

    const state: PointerState = {
      targetX: 0,
      targetY: 0,
      x: 0,
      y: 0,
      targetMix: 0,
      mix: 0,
    }
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const startedAt = performance.now()
    let animationFrame = 0
    let inViewport = true
    let pageVisible = !document.hidden
    let running = false

    const draw = (timestamp: number): void => {
      state.x += (state.targetX - state.x) * 0.09
      state.y += (state.targetY - state.y) * 0.09
      state.mix += (state.targetMix - state.mix) * 0.08
      renderSurface(surface, state, tone, (timestamp - startedAt) / 1000)
      canvas.classList.add('auth-dither-canvas-ready')
    }

    const animate = (timestamp: number): void => {
      if (!running) return
      draw(timestamp)
      animationFrame = requestAnimationFrame(animate)
    }

    const stop = (): void => {
      running = false
      cancelAnimationFrame(animationFrame)
    }

    const start = (): void => {
      if (running || !inViewport || !pageVisible) return
      resizeCanvas(canvas, surface.gl)
      if (state.x === 0 && state.y === 0) {
        state.x = surface.gl.drawingBufferWidth / 2
        state.y = surface.gl.drawingBufferHeight / 2
        state.targetX = state.x
        state.targetY = state.y
      }
      if (reduceMotion) {
        draw(startedAt + 4200)
        return
      }
      running = true
      animationFrame = requestAnimationFrame(animate)
    }

    const reconcileActivity = (): void => {
      if (inViewport && pageVisible) start()
      else stop()
    }

    const handleResize = (): void => {
      resizeCanvas(canvas, surface.gl)
      if (!running) draw(performance.now())
    }

    const handlePointerMove = (event: PointerEvent): void => {
      const bounds = container.getBoundingClientRect()
      const inside =
        event.clientX >= bounds.left &&
        event.clientX <= bounds.right &&
        event.clientY >= bounds.top &&
        event.clientY <= bounds.bottom
      state.targetMix = inside ? 1 : 0
      if (!inside) return
      const scaleX = surface.gl.drawingBufferWidth / bounds.width
      const scaleY = surface.gl.drawingBufferHeight / bounds.height
      state.targetX = (event.clientX - bounds.left) * scaleX
      state.targetY = (bounds.bottom - event.clientY) * scaleY
    }

    const handleVisibilityChange = (): void => {
      pageVisible = !document.hidden
      reconcileActivity()
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(container)
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        inViewport = entry?.isIntersecting ?? false
        reconcileActivity()
      },
      { rootMargin: '160px' },
    )
    intersectionObserver.observe(container)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    start()

    return () => {
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pointermove', handlePointerMove)
      surface.gl.deleteVertexArray(surface.vertexArray)
      surface.gl.deleteBuffer(surface.vertexBuffer)
      surface.gl.deleteProgram(surface.program)
    }
  }, [tone])

  return (
    <div ref={containerRef} className="auth-dither-root" aria-hidden="true">
      <canvas ref={canvasRef} className="auth-dither-canvas" />
    </div>
  )
}
