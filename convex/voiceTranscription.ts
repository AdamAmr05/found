import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai'
import { MINUTE, RateLimiter } from '@convex-dev/rate-limiter'
import { APICallError, NoTranscriptGeneratedError, transcribe } from 'ai'
import { ConvexError, v } from 'convex/values'

import { components } from './_generated/api'
import { action, env } from './_generated/server'
import { FOUND_TRANSCRIPTION_MODEL } from './aiModel'
import { requireViewerId } from './viewer'
import {
  VOICE_RECORDING_MAX_AUDIO_BYTES,
  hasVoiceRecordingSignature,
  voiceRecordingFormat,
  type VoiceRecordingFormat,
} from '../shared/voiceRecording'

// The seam only needs the one-shot generate path, so a streaming-capable
// provider model and a test double are both accepted.
type TranscriptionModel = Pick<
  ReturnType<OpenAIProvider['transcription']>,
  'specificationVersion' | 'provider' | 'modelId' | 'doGenerate'
>

const TRANSCRIPTION_TIMEOUT_MS = 60_000
const MAX_AUDIO_BASE64_LENGTH =
  Math.ceil(VOICE_RECORDING_MAX_AUDIO_BYTES / 3) * 4

// Every recording is a billed provider call, so it is budgeted per user.
const rateLimiter = new RateLimiter(components.rateLimiter, {
  transcribeVoice: {
    kind: 'token bucket',
    rate: 30,
    period: MINUTE,
    capacity: 10,
  },
})

function openAiTranscriptionModel(): TranscriptionModel {
  return createOpenAI({ apiKey: env.OPENAI_API_KEY }).transcription(
    FOUND_TRANSCRIPTION_MODEL,
  )
}

let transcriptionModelFactory: () => TranscriptionModel =
  openAiTranscriptionModel

/**
 * Test seam. convex-test loads this module in-process, so a test injects a
 * deterministic model here instead of mocking the provider package.
 */
export function setTranscriptionModelForTests(
  factory: (() => TranscriptionModel) | null,
): void {
  transcriptionModelFactory = factory ?? openAiTranscriptionModel
}

export type TranscriptionGenerate = TranscriptionModel['doGenerate']

function decodeAudio(
  audioBase64: string,
  format: VoiceRecordingFormat,
): Uint8Array {
  if (audioBase64.length === 0) {
    throw new ConvexError({ code: 'VOICE_RECORDING_INVALID' })
  }
  if (audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
    throw new ConvexError({ code: 'VOICE_RECORDING_TOO_LARGE' })
  }

  let binary: string
  try {
    binary = atob(audioBase64)
  } catch {
    throw new ConvexError({ code: 'VOICE_RECORDING_INVALID' })
  }
  const audio = Uint8Array.from(binary, (byte) => byte.charCodeAt(0))

  // atob tolerates whitespace and stray trailing bits; only a canonical
  // encoding of real audio bytes is accepted.
  const canonical = btoa(binary).replace(/=+$/u, '')
  if (audio.byteLength === 0 || canonical !== audioBase64.replace(/=+$/u, '')) {
    throw new ConvexError({ code: 'VOICE_RECORDING_INVALID' })
  }
  if (audio.byteLength > VOICE_RECORDING_MAX_AUDIO_BYTES) {
    throw new ConvexError({ code: 'VOICE_RECORDING_TOO_LARGE' })
  }
  if (!hasVoiceRecordingSignature(audio, format)) {
    throw new ConvexError({ code: 'VOICE_RECORDING_INVALID' })
  }
  return audio
}

// The SDK sniffs the media type from the bytes and misreads ordinary MP4
// atoms, so the validated format is handed to the provider explicitly.
function modelForFormat(format: VoiceRecordingFormat): TranscriptionModel {
  const model = transcriptionModelFactory()
  const mediaType = format === 'webm' ? 'audio/webm' : 'audio/mp4'
  return {
    specificationVersion: model.specificationVersion,
    provider: model.provider,
    modelId: model.modelId,
    doGenerate: (options) => model.doGenerate({ ...options, mediaType }),
  }
}

async function transcribeAudio(
  audio: Uint8Array,
  format: VoiceRecordingFormat,
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TRANSCRIPTION_TIMEOUT_MS)
  try {
    const result = await transcribe({
      model: modelForFormat(format),
      audio,
      abortSignal: controller.signal,
    })
    return result.text.trim()
  } catch (cause) {
    if (NoTranscriptGeneratedError.isInstance(cause)) {
      throw new ConvexError({ code: 'VOICE_NO_SPEECH' })
    }
    throw new ConvexError({
      code: 'VOICE_TRANSCRIPTION_FAILED',
      status: APICallError.isInstance(cause)
        ? (cause.statusCode ?? null)
        : null,
    })
  } finally {
    clearTimeout(timeout)
  }
}

export const transcribeVoice = action({
  args: {
    audioBase64: v.string(),
    audioFormat: voiceRecordingFormat,
  },
  returns: v.object({ text: v.string() }),
  handler: async (ctx, args) => {
    const userId = await requireViewerId(ctx)
    await rateLimiter.limit(ctx, 'transcribeVoice', {
      key: userId,
      throws: true,
    })
    const audio = decodeAudio(args.audioBase64, args.audioFormat)
    const text = await transcribeAudio(audio, args.audioFormat)
    if (text.length === 0) {
      throw new ConvexError({ code: 'VOICE_NO_SPEECH' })
    }
    return { text }
  },
})
