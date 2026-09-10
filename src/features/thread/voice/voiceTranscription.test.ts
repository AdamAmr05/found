import { ConvexError } from 'convex/values'
import { describe, expect, test } from 'vitest'

import { VOICE_RECORDING_MAX_AUDIO_BYTES } from '../../../../shared/voiceRecording'
import { appendTranscriptToDraft } from './useVoiceTranscription'
import { VoiceRecordingError, voiceRecordingToBase64 } from './voiceRecording'
import { formatVoiceRecordingDuration } from './VoiceRecordingBar'
import { voiceTranscriptionErrorMessage } from './voiceTranscriptionErrors'

const WEBM_HEADER = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])
const MP4_HEADER = new Uint8Array([
  0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
])

async function encodingFailure(
  audio: Blob,
  format: 'webm' | 'mp4',
): Promise<string> {
  try {
    await voiceRecordingToBase64({ audio, format })
  } catch (cause) {
    if (cause instanceof VoiceRecordingError) return cause.message
    throw cause
  }
  throw new Error('Expected the recording to be rejected')
}

describe('voice transcript draft insertion', () => {
  test('inserts a transcript into an empty draft', () => {
    expect(
      appendTranscriptToDraft('', '  A quiet flat near the river.  '),
    ).toBe('A quiet flat near the river.')
  })

  test('appends without damaging existing draft whitespace', () => {
    expect(appendTranscriptToDraft('Please', 'find a studio.')).toBe(
      'Please find a studio.',
    )
    expect(appendTranscriptToDraft('Please\n', 'find a studio.')).toBe(
      'Please\nfind a studio.',
    )
  })

  test('ignores an empty transcript', () => {
    expect(appendTranscriptToDraft('Existing draft', '   ')).toBe(
      'Existing draft',
    )
  })
})

describe('voice recording timer', () => {
  test('formats elapsed time with a fixed digit width', () => {
    expect(formatVoiceRecordingDuration(0)).toBe('0:00')
    expect(formatVoiceRecordingDuration(65_999)).toBe('1:05')
    expect(formatVoiceRecordingDuration(5 * 60 * 1000)).toBe('5:00')
  })
})

describe('voice recording encoding', () => {
  test('encodes a recording whose bytes match its declared format', async () => {
    expect(
      await voiceRecordingToBase64({
        audio: new Blob([WEBM_HEADER]),
        format: 'webm',
      }),
    ).toBe('GkXfow==')
    expect(
      await voiceRecordingToBase64({
        audio: new Blob([MP4_HEADER]),
        format: 'mp4',
      }),
    ).toBe('AAAAGGZ0eXA=')
  })

  test('rejects a recording that does not match its declared format', async () => {
    expect(await encodingFailure(new Blob([WEBM_HEADER]), 'mp4')).toContain(
      'invalid recording',
    )
  })

  test('rejects an empty recording before uploading it', async () => {
    expect(await encodingFailure(new Blob(), 'webm')).toBe(
      'No speech was recorded. Try again.',
    )
  })

  test('rejects a recording over the upload limit before reading it', async () => {
    const oversized = new Blob([
      new Uint8Array(VOICE_RECORDING_MAX_AUDIO_BYTES + 1),
    ])
    expect(await encodingFailure(oversized, 'webm')).toContain('too long')
  })
})

describe('voice transcription error copy', () => {
  test('shows the local recording problem verbatim', () => {
    expect(
      voiceTranscriptionErrorMessage(new VoiceRecordingError('No speech.')),
    ).toBe('No speech.')
  })

  test('explains microphone permission and hardware failures', () => {
    expect(
      voiceTranscriptionErrorMessage(
        new DOMException('Permission denied', 'NotAllowedError'),
      ),
    ).toBe('Microphone access is required for voice transcription.')
    expect(
      voiceTranscriptionErrorMessage(
        new DOMException('Requested device not found', 'NotFoundError'),
      ),
    ).toBe('No microphone was found.')
  })

  test('maps the action failure codes to safe copy', () => {
    expect(
      voiceTranscriptionErrorMessage(
        new ConvexError({ code: 'VOICE_NO_SPEECH' }),
      ),
    ).toBe('No speech was detected. Try again.')
    expect(
      voiceTranscriptionErrorMessage(
        new ConvexError({ code: 'VOICE_TRANSCRIPTION_FAILED', status: 401 }),
      ),
    ).toBe('Voice transcription is unavailable right now. Try again.')
  })

  test('turns a rate limit into a retry delay', () => {
    expect(
      voiceTranscriptionErrorMessage(
        new ConvexError({
          kind: 'RateLimited',
          name: 'transcribeVoice',
          retryAfter: 12_500,
        }),
      ),
    ).toBe('Too many recordings. Try again in 13 seconds.')
    expect(
      voiceTranscriptionErrorMessage(
        new ConvexError({
          kind: 'RateLimited',
          name: 'transcribeVoice',
          retryAfter: 90_000,
        }),
      ),
    ).toBe('Too many recordings. Try again in 2 minutes.')
  })

  test('never surfaces raw diagnostics', () => {
    const raw = '[CONVEX A(voiceTranscription:transcribeVoice)] Server Error'
    expect(voiceTranscriptionErrorMessage(new Error(raw))).toBe(
      'Voice transcription failed. Try again.',
    )
    expect(
      voiceTranscriptionErrorMessage(new ConvexError({ code: 'SOMETHING' })),
    ).toBe('Voice transcription failed. Try again.')
  })
})
