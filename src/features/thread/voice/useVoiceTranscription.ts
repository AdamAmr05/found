import { useAction } from 'convex/react'
import { useEffect, useRef, useState } from 'react'

import { api } from '../../../../convex/_generated/api'
import {
  isVoiceRecordingSupported,
  startVoiceRecording,
  voiceRecordingToBase64,
  type VoiceRecording,
} from './voiceRecording'
import { voiceTranscriptionErrorMessage } from './voiceTranscriptionErrors'

/** Whether a finished recording lands in the draft or is sent straight away. */
export type VoiceTranscriptionCompletion = 'draft' | 'submit'

export type VoiceTranscriptionState =
  | { readonly status: 'idle' }
  | { readonly status: 'requesting' }
  | {
      readonly status: 'recording'
      readonly recorder: MediaRecorder
      readonly startedAt: number
    }
  | { readonly status: 'transcribing' }
  | { readonly status: 'error'; readonly message: string }

type TranscriptHandler = (
  transcript: string,
  completion: VoiceTranscriptionCompletion,
) => void

export function appendTranscriptToDraft(
  draft: string,
  transcript: string,
): string {
  const text = transcript.trim()
  if (text.length === 0) return draft
  if (draft.length === 0) return text
  return `${draft}${/\s$/u.test(draft) ? '' : ' '}${text}`
}

// Owns one capture-and-transcribe lifecycle at a time. Each start bumps an
// operation id so a cancelled or superseded run can never touch the draft.
export function useVoiceTranscription(onTranscript: TranscriptHandler) {
  const transcribeVoice = useAction(api.voiceTranscription.transcribeVoice)
  const [supported, setSupported] = useState(false)
  const [state, setState] = useState<VoiceTranscriptionState>({
    status: 'idle',
  })
  const operationRef = useRef(0)
  const recordingRef = useRef<VoiceRecording | null>(null)
  const completionRef = useRef<VoiceTranscriptionCompletion>('draft')
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  })

  useEffect(() => {
    // oxlint-disable-next-line react-hooks/set-state-in-effect -- capture support is a browser capability unknown during SSR.
    setSupported(isVoiceRecordingSupported())
  }, [])

  // Unmounting cancels a live capture so the microphone never outlives the composer.
  useEffect(
    () => () => {
      operationRef.current += 1
      recordingRef.current?.cancel()
      recordingRef.current = null
    },
    [],
  )

  async function run(operationId: number): Promise<void> {
    try {
      const recording = await startVoiceRecording()
      if (operationRef.current !== operationId) {
        recording.cancel()
        return
      }
      recordingRef.current = recording
      setState({
        status: 'recording',
        recorder: recording.recorder,
        startedAt: recording.startedAt,
      })

      const captured = await recording.finished
      recordingRef.current = null
      if (operationRef.current !== operationId || !captured) return

      setState({ status: 'transcribing' })
      const { text } = await transcribeVoice({
        audioBase64: await voiceRecordingToBase64(captured),
        audioFormat: captured.format,
      })
      if (operationRef.current !== operationId) return

      onTranscriptRef.current(text, completionRef.current)
      completionRef.current = 'draft'
      setState({ status: 'idle' })
    } catch (cause) {
      if (operationRef.current !== operationId) return
      completionRef.current = 'draft'
      setState({
        status: 'error',
        message: voiceTranscriptionErrorMessage(cause),
      })
    }
  }

  function startRecording(): void {
    if (state.status !== 'idle' && state.status !== 'error') return
    operationRef.current += 1
    completionRef.current = 'draft'
    setState({ status: 'requesting' })
    void run(operationRef.current)
  }

  function stopRecording(completion: VoiceTranscriptionCompletion): void {
    const recording = recordingRef.current
    if (!recording) return
    completionRef.current = completion
    setState({ status: 'transcribing' })
    recording.stop()
  }

  // Drops the capture without transcribing; the draft is left untouched.
  function cancelRecording(): void {
    const recording = recordingRef.current
    if (!recording) return
    operationRef.current += 1
    recordingRef.current = null
    completionRef.current = 'draft'
    recording.cancel()
    setState({ status: 'idle' })
  }

  function dismissError(): void {
    if (state.status === 'error') setState({ status: 'idle' })
  }

  return {
    supported,
    state,
    startRecording,
    stopRecording,
    cancelRecording,
    dismissError,
  }
}
