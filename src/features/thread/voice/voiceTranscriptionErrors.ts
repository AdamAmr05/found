import { ConvexError } from 'convex/values'
import { z } from 'zod'

import { VoiceRecordingError } from './voiceRecording'

const FALLBACK_MESSAGE = 'Voice transcription failed. Try again.'

const voiceFailureCode = z.enum([
  'VOICE_RECORDING_INVALID',
  'VOICE_RECORDING_TOO_LARGE',
  'VOICE_NO_SPEECH',
  'VOICE_TRANSCRIPTION_FAILED',
  'UNAUTHENTICATED',
])

type VoiceFailureCode = z.infer<typeof voiceFailureCode>

// The action's failures and the rate limiter's are parsed here, at the client
// boundary, before they become copy.
const voiceFailureData = z.union([
  z.object({ code: voiceFailureCode }),
  z.object({ kind: z.literal('RateLimited'), retryAfter: z.number() }),
])

const CODE_MESSAGES = {
  VOICE_RECORDING_INVALID:
    'This browser produced an invalid recording. Try again.',
  VOICE_RECORDING_TOO_LARGE:
    'That recording is too long. Record a shorter message.',
  VOICE_NO_SPEECH: 'No speech was detected. Try again.',
  VOICE_TRANSCRIPTION_FAILED:
    'Voice transcription is unavailable right now. Try again.',
  UNAUTHENTICATED: 'Sign in again to use voice transcription.',
} satisfies Record<VoiceFailureCode, string>

function retryDelay(retryAfterMs: number): string {
  if (retryAfterMs < 60_000) {
    const seconds = Math.max(1, Math.ceil(retryAfterMs / 1_000))
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`
  }
  const minutes = Math.ceil(retryAfterMs / 60_000)
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
}

function microphoneMessage(exception: DOMException): string {
  switch (exception.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Microphone access is required for voice transcription.'
    case 'NotFoundError':
      return 'No microphone was found.'
    case 'NotReadableError':
      return 'The microphone is in use by another application.'
    default:
      return 'The microphone could not be started. Try again.'
  }
}

export function voiceTranscriptionErrorMessage(cause: unknown): string {
  if (cause instanceof VoiceRecordingError) return cause.message
  if (cause instanceof DOMException) return microphoneMessage(cause)
  if (!(cause instanceof ConvexError)) return FALLBACK_MESSAGE

  const parsed = voiceFailureData.safeParse(cause.data)
  if (!parsed.success) return FALLBACK_MESSAGE
  if ('kind' in parsed.data) {
    return `Too many recordings. Try again in ${retryDelay(parsed.data.retryAfter)}.`
  }
  return CODE_MESSAGES[parsed.data.code]
}
