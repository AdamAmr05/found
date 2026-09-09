import { flowFragment } from './flowFragment'

const vertex = `
attribute vec2 position;
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`

function compile(gl: WebGLRenderingContext, kind: number, source: string) {
  const shader = gl.createShader(kind)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader
  gl.deleteShader(shader)
  return null
}

function tokenColor(canvas: HTMLCanvasElement, token: string) {
  const context = document.createElement('canvas').getContext('2d')
  if (!context) return new Float32Array([1, 1, 1])
  context.fillStyle = getComputedStyle(canvas).getPropertyValue(token).trim()
  context.fillRect(0, 0, 1, 1)
  const pixel = context.getImageData(0, 0, 1, 1).data
  return new Float32Array(Array.from(pixel.slice(0, 3), (value) => value / 255))
}

export function createAtmosphereRenderer(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    premultipliedAlpha: false,
    antialias: false,
    depth: false,
  })
  if (!gl) return null
  const vert = compile(gl, gl.VERTEX_SHADER, vertex)
  const frag = compile(gl, gl.FRAGMENT_SHADER, flowFragment)
  const program = gl.createProgram()
  const buffer = gl.createBuffer()
  const dispose = () => {
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
    gl.deleteShader(vert)
    gl.deleteShader(frag)
  }
  if (!vert || !frag || !program || !buffer) {
    dispose()
    return null
  }
  gl.attachShader(program, vert)
  gl.attachShader(program, frag)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    dispose()
    return null
  }
  gl.useProgram(program)
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  )
  const position = gl.getAttribLocation(program, 'position')
  gl.enableVertexAttribArray(position)
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  gl.uniform3fv(
    gl.getUniformLocation(program, 'amber'),
    tokenColor(canvas, '--color-atmosphere-amber'),
  )
  gl.uniform3fv(
    gl.getUniformLocation(program, 'heat'),
    tokenColor(canvas, '--color-heat-100'),
  )
  gl.uniform3fv(
    gl.getUniformLocation(program, 'burnt'),
    tokenColor(canvas, '--color-atmosphere-burnt'),
  )
  const time = gl.getUniformLocation(program, 't')
  const resolution = gl.getUniformLocation(program, 'r')
  const cursor = gl.getUniformLocation(program, 'cursor')
  const presence = gl.getUniformLocation(program, 'presence')
  return {
    draw(seconds: number, x: number, y: number, intensity: number) {
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform1f(time, seconds)
      gl.uniform2f(resolution, canvas.width, canvas.height)
      gl.uniform2f(cursor, x * canvas.width, y * canvas.height)
      gl.uniform1f(presence, intensity)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose,
  }
}
