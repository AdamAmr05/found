import {
  VOICE_RECORDING_MAX_AUDIO_BYTES,
  VOICE_RECORDING_MAX_DURATION_MS,
  hasVoiceRecordingSignature,
  type VoiceRecordingFormat,
} from '../../../../shared/voiceRecording'

const BASE64_CHUNK_BYTES = 32 * 1024

// Chrome and Firefox record Opus in WebM; Safari only records AAC in MP4.
const RECORDING_OPTIONS: readonly {
  readonly format: VoiceRecordingFormat
  readonly mimeType: string
}[] = [
  { format: 'webm', mimeType: 'audio/webm;codecs=opus' },
  { format: 'webm', mimeType: 'audio/webm' },
  { format: 'mp4', mimeType: 'audio/mp4;codecs=mp4a.40.2' },
  { format: 'mp4', mimeType: 'audio/mp4' },
]

type RecordingOption = (typeof RECORDING_OPTIONS)[number]

/** A recording problem the browser produced locally, with copy safe to show. */
export class VoiceRecordingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VoiceRecordingError'
  }
}

export type VoiceRecordingResult = {
  readonly audio: Blob
  readonly format: VoiceRecordingFormat
}

export type VoiceRecording = {
  readonly recorder: MediaRecorder
  readonly startedAt: number
  /** Resolves with the captured audio, or null once cancelled. */
  readonly finished: Promise<VoiceRecordingResult | null>
  readonly stop: () => void
  readonly cancel: () => void
}

function supportedRecordingOption(): RecordingOption | undefined {
  if (globalThis.MediaRecorder === undefined) return undefined
  return RECORDING_OPTIONS.find((option) =>
    MediaRecorder.isTypeSupported(option.mimeType),
  )
}

export function isVoiceRecordingSupported(): boolean {
  return (
    globalThis.navigator !== undefined &&
    navigator.mediaDevices !== undefined &&
    supportedRecordingOption() !== undefined
  )
}

export async function voiceRecordingToBase64(
  recording: VoiceRecordingResult,
): Promise<string> {
  if (recording.audio.size === 0) {
    throw new VoiceRecordingError('No speech was recorded. Try again.')
  }
  if (recording.audio.size > VOICE_RECORDING_MAX_AUDIO_BYTES) {
    throw new VoiceRecordingError(
      'That recording is too long. Record a shorter message.',
    )
  }

  const bytes = new Uint8Array(await recording.audio.arrayBuffer())
  if (!hasVoiceRecordingSignature(bytes, recording.format)) {
    throw new VoiceRecordingError(
      'This browser produced an invalid recording. Try again.',
    )
  }

  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_BYTES) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + BASE64_CHUNK_BYTES),
    )
  }
  return btoa(binary)
}

function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop()
}

export async function startVoiceRecording(): Promise<VoiceRecording> {
  const option = supportedRecordingOption()
  if (!option) {
    throw new VoiceRecordingError(
      'Voice transcription is not supported in this browser.',
    )
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  try {
    return beginRecording(stream, option)
  } catch (cause) {
    stopTracks(stream)
    throw cause
  }
}

function beginRecording(
  stream: MediaStream,
  option: RecordingOption,
): VoiceRecording {
  const recorder = new MediaRecorder(stream, {
    audioBitsPerSecond: 48_000,
    mimeType: option.mimeType,
  })
  const chunks: Blob[] = []
  let settled = false
  let resolveFinished: (result: VoiceRecordingResult | null) => void = () =>
    undefined
  const finished = new Promise<VoiceRecordingResult | null>((resolve) => {
    resolveFinished = resolve
  })

  const timeout = setTimeout(() => {
    if (recorder.state === 'recording') recorder.stop()
  }, VOICE_RECORDING_MAX_DURATION_MS)

  const cleanup = (): void => {
    clearTimeout(timeout)
    recorder.removeEventListener('dataavailable', onDataAvailable)
    recorder.removeEventListener('error', onError)
    recorder.removeEventListener('stop', onStop)
    // Releasing the tracks is what turns the browser's microphone indicator off.
    stopTracks(stream)
  }
  const settle = (result: VoiceRecordingResult | null): void => {
    if (settled) return
    settled = true
    cleanup()
    resolveFinished(result)
  }
  const onDataAvailable = (event: BlobEvent): void => {
    if (event.data.size > 0) chunks.push(event.data)
  }
  const onError = (): void => {
    settle({ audio: new Blob(), format: option.format })
    if (recorder.state !== 'inactive') recorder.stop()
  }
  const onStop = (): void => {
    settle({
      audio: new Blob(chunks, { type: recorder.mimeType }),
      format: option.format,
    })
  }

  recorder.addEventListener('dataavailable', onDataAvailable)
  recorder.addEventListener('error', onError, { once: true })
  recorder.addEventListener('stop', onStop, { once: true })
  try {
    recorder.start()
  } catch (cause) {
    cleanup()
    throw cause
  }

  return {
    recorder,
    startedAt: Date.now(),
    finished,
    stop: () => {
      if (recorder.state === 'recording') recorder.stop()
    },
    cancel: () => {
      settle(null)
      if (recorder.state !== 'inactive') recorder.stop()
    },
  }
}
