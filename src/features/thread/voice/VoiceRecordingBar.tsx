import { useEffect, useRef, useState } from 'react'

const TIMER_REFRESH_MS = 250
const WAVEFORM_SAMPLE_MS = 45
const WAVEFORM_BAR_WIDTH = 2
const WAVEFORM_BAR_GAP = 2

function waveformLevel(samples: Uint8Array): number {
  let sumOfSquares = 0
  for (const sample of samples) {
    const amplitude = (sample - 128) / 128
    sumOfSquares += amplitude * amplitude
  }
  return Math.min(1, Math.sqrt(sumOfSquares / samples.length) * 6)
}

function drawWaveform(
  canvas: HTMLCanvasElement,
  levels: readonly number[],
  color: string,
): void {
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  const pixelRatio = window.devicePixelRatio || 1
  const renderedWidth = Math.max(1, Math.round(width * pixelRatio))
  const renderedHeight = Math.max(1, Math.round(height * pixelRatio))
  if (canvas.width !== renderedWidth || canvas.height !== renderedHeight) {
    canvas.width = renderedWidth
    canvas.height = renderedHeight
  }

  const context = canvas.getContext('2d')
  if (!context) return
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  context.clearRect(0, 0, width, height)
  context.fillStyle = color

  // Newest level sits at the right edge; history scrolls left as it fills.
  const step = WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP
  const startX = width - levels.length * step
  levels.forEach((level, index) => {
    const barHeight = Math.max(1, level * (height - 2))
    const x = startX + index * step
    const y = (height - barHeight) / 2
    context.beginPath()
    context.roundRect(x, y, WAVEFORM_BAR_WIDTH, barHeight, WAVEFORM_BAR_WIDTH)
    context.fill()
  })
}

// Samples the live microphone stream outside React's render cycle and draws
// the level history onto a canvas whose color comes from the text token.
function VoiceWaveform({ recorder }: { readonly recorder: MediaRecorder }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaStreamSource(recorder.stream)
    const levels: number[] = []
    const waveformColor = getComputedStyle(canvas).color
    let animationFrameId = 0
    let lastSampleAt = 0
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.55
    const samples = new Uint8Array(analyser.fftSize)
    source.connect(analyser)
    void audioContext.resume().catch(() => undefined)

    const render = (timestamp: number): void => {
      if (timestamp - lastSampleAt >= WAVEFORM_SAMPLE_MS) {
        analyser.getByteTimeDomainData(samples)
        levels.push(waveformLevel(samples))
        const maxBars = Math.ceil(
          canvas.clientWidth / (WAVEFORM_BAR_WIDTH + WAVEFORM_BAR_GAP),
        )
        if (levels.length > maxBars) {
          levels.splice(0, levels.length - maxBars)
        }
        lastSampleAt = timestamp
        drawWaveform(canvas, levels, waveformColor)
      }
      animationFrameId = window.requestAnimationFrame(render)
    }
    animationFrameId = window.requestAnimationFrame(render)

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      source.disconnect()
      analyser.disconnect()
      void audioContext.close().catch(() => undefined)
    }
  }, [recorder])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 size-full text-accent-black"
    />
  )
}

export function formatVoiceRecordingDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

interface VoiceRecordingBarProps {
  readonly recorder: MediaRecorder
  readonly startedAt: number
}

// Stands in for the textarea while the microphone is live: a level history,
// a dashed rest line, and the elapsed time.
export function VoiceRecordingBar({
  recorder,
  startedAt,
}: VoiceRecordingBarProps) {
  const [elapsedMs, setElapsedMs] = useState(() => Date.now() - startedAt)

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, TIMER_REFRESH_MS)
    return () => window.clearInterval(intervalId)
  }, [startedAt])

  return (
    <div className="flex h-40 min-w-0 flex-1 items-center gap-12 px-8">
      <output className="sr-only">Voice recording in progress</output>
      <div aria-hidden className="relative h-32 min-w-0 flex-1 overflow-hidden">
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border-muted" />
        <VoiceWaveform recorder={recorder} />
      </div>
      <span
        aria-hidden
        className="shrink-0 text-body-small text-foreground-muted tabular-nums"
      >
        {formatVoiceRecordingDuration(elapsedMs)}
      </span>
    </div>
  )
}
