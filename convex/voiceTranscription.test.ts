/// <reference types="vite/client" />

import { register as registerRateLimiter } from '@convex-dev/rate-limiter/test'
import { MockTranscriptionModelV4 } from 'ai/test'
import { convexTest } from 'convex-test'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { api } from './_generated/api'
import { FOUND_TRANSCRIPTION_MODEL } from './aiModel'
import schema from './schema'
import {
  setTranscriptionModelForTests,
  type TranscriptionGenerate,
} from './voiceTranscription'

const modules = import.meta.glob('./**/*.ts')

const WEBM_AUDIO_BASE64 = 'GkXfo2RtbXk='
const MP4_AUDIO_BASE64 = 'AAAAHGZ0eXBtcDQy'

function transcript(text: string) {
  return {
    text,
    segments: [],
    language: 'en',
    durationInSeconds: 1,
    warnings: [],
    response: {
      timestamp: new Date(),
      modelId: FOUND_TRANSCRIPTION_MODEL,
      headers: {},
      body: { text },
    },
  }
}

// Replaces the OpenAI transcription model with one that records its calls.
function installModel(text: string) {
  const generate = vi.fn<TranscriptionGenerate>(() =>
    Promise.resolve(transcript(text)),
  )
  setTranscriptionModelForTests(
    () =>
      new MockTranscriptionModelV4({
        provider: 'openai.transcription',
        modelId: FOUND_TRANSCRIPTION_MODEL,
        doGenerate: generate,
      }),
  )
  return generate
}

async function setup() {
  const t = convexTest(schema, modules)
  registerRateLimiter(t)
  const userId = await t.run(
    async (ctx) => await ctx.db.insert('users', { displayName: 'Voice' }),
  )
  return { t, user: t.withIdentity({ subject: userId }) }
}

afterEach(() => setTranscriptionModelForTests(null))

describe('voice transcription', () => {
  test('transcribes a WebM recording through the configured model', async () => {
    const generate = installModel('  Somewhere quiet near the river.  ')
    const { user } = await setup()

    const result = await user.action(api.voiceTranscription.transcribeVoice, {
      audioBase64: WEBM_AUDIO_BASE64,
      audioFormat: 'webm',
    })

    expect(result).toEqual({ text: 'Somewhere quiet near the river.' })
    expect(generate).toHaveBeenCalledOnce()
    expect(generate.mock.calls[0]?.[0].mediaType).toBe('audio/webm')
  })

  test("preserves Safari's MP4 format at the provider boundary", async () => {
    const generate = installModel('Confirm the viewing.')
    const { user } = await setup()

    await user.action(api.voiceTranscription.transcribeVoice, {
      audioBase64: MP4_AUDIO_BASE64,
      audioFormat: 'mp4',
    })

    expect(generate.mock.calls[0]?.[0].mediaType).toBe('audio/mp4')
  })

  test('rejects malformed audio before calling the provider', async () => {
    const generate = installModel('never')
    const { user } = await setup()

    await expect(
      user.action(api.voiceTranscription.transcribeVoice, {
        audioBase64: 'not-base64!',
        audioFormat: 'webm',
      }),
    ).rejects.toMatchObject({ data: { code: 'VOICE_RECORDING_INVALID' } })
    await expect(
      user.action(api.voiceTranscription.transcribeVoice, {
        audioBase64: WEBM_AUDIO_BASE64,
        audioFormat: 'mp4',
      }),
    ).rejects.toMatchObject({ data: { code: 'VOICE_RECORDING_INVALID' } })
    expect(generate).not.toHaveBeenCalled()
  })

  test('reports silence instead of returning an empty prompt', async () => {
    installModel('   ')
    const { user } = await setup()

    await expect(
      user.action(api.voiceTranscription.transcribeVoice, {
        audioBase64: WEBM_AUDIO_BASE64,
        audioFormat: 'webm',
      }),
    ).rejects.toMatchObject({ data: { code: 'VOICE_NO_SPEECH' } })
  })

  test('requires a signed-in caller', async () => {
    const generate = installModel('never')
    const { t } = await setup()

    await expect(
      t.action(api.voiceTranscription.transcribeVoice, {
        audioBase64: WEBM_AUDIO_BASE64,
        audioFormat: 'webm',
      }),
    ).rejects.toMatchObject({ data: { code: 'UNAUTHENTICATED' } })
    expect(generate).not.toHaveBeenCalled()
  })

  test('budgets recordings per user', async () => {
    const generate = installModel('Again.')
    const { user } = await setup()

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await user.action(api.voiceTranscription.transcribeVoice, {
        audioBase64: WEBM_AUDIO_BASE64,
        audioFormat: 'webm',
      })
    }
    await expect(
      user.action(api.voiceTranscription.transcribeVoice, {
        audioBase64: WEBM_AUDIO_BASE64,
        audioFormat: 'webm',
      }),
    ).rejects.toMatchObject({ data: { kind: 'RateLimited' } })
    expect(generate).toHaveBeenCalledTimes(10)
  })
})
