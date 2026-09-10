import { type Infer, v } from 'convex/values'

// A recording travels to the transcription action as one base64 argument.
// 3 MiB of audio is the largest payload the deployment accepts reliably; at
// the recorder's 48 kbps that comfortably covers the five-minute cap.
export const VOICE_RECORDING_MAX_AUDIO_BYTES = 3 * 1024 * 1024
export const VOICE_RECORDING_MAX_DURATION_MS = 5 * 60 * 1000

export const voiceRecordingFormat = v.union(v.literal('webm'), v.literal('mp4'))

export type VoiceRecordingFormat = Infer<typeof voiceRecordingFormat>

// The container signature is checked on both sides so an empty, truncated, or
// mislabeled payload never reaches the transcription provider.
export function hasVoiceRecordingSignature(
  audio: Uint8Array,
  format: VoiceRecordingFormat,
): boolean {
  if (format === 'webm') {
    return (
      audio[0] === 0x1a &&
      audio[1] === 0x45 &&
      audio[2] === 0xdf &&
      audio[3] === 0xa3
    )
  }
  // MP4 begins with a box length, then the `ftyp` atom.
  return (
    audio[4] === 0x66 &&
    audio[5] === 0x74 &&
    audio[6] === 0x79 &&
    audio[7] === 0x70
  )
}
