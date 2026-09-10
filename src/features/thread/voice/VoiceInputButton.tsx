import { CircleNotch, Microphone, Stop } from '@phosphor-icons/react'

import type { VoiceTranscriptionState } from './useVoiceTranscription'

function voiceButtonLabel(state: VoiceTranscriptionState): string {
  switch (state.status) {
    case 'recording':
      return 'Stop voice recording'
    case 'requesting':
      return 'Requesting microphone access'
    case 'transcribing':
      return 'Transcribing voice recording'
    case 'error':
      return 'Retry voice transcription'
    case 'idle':
      return 'Start voice transcription'
  }
}

interface VoiceInputButtonProps {
  readonly disabled: boolean
  readonly state: VoiceTranscriptionState
  readonly onStart: () => void
  readonly onStop: () => void
}

// One control that morphs between microphone, stop, and busy without moving,
// so its position and accessible role stay stable across the whole flow.
export function VoiceInputButton({
  disabled,
  state,
  onStart,
  onStop,
}: VoiceInputButtonProps) {
  const recording = state.status === 'recording'
  const transcribing = state.status === 'transcribing'
  const tone = recording
    ? 'bg-accent-crimson/8 text-accent-crimson hover:bg-accent-crimson/12'
    : 'text-foreground-muted hover:bg-accent-black/4 hover:text-accent-black'

  return (
    <button
      aria-label={voiceButtonLabel(state)}
      aria-pressed={recording}
      className={`mb-2 grid size-36 shrink-0 place-items-center rounded-10 transition-[background-color,color] duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 disabled:text-foreground-muted/50 disabled:hover:bg-transparent ${tone}`}
      disabled={!recording && (disabled || transcribing)}
      type="button"
      onClick={recording ? onStop : onStart}
    >
      {transcribing ? (
        <CircleNotch
          aria-hidden
          className="size-18 animate-spin motion-reduce:animate-none"
        />
      ) : recording ? (
        <Stop aria-hidden className="size-16" weight="fill" />
      ) : (
        <Microphone aria-hidden className="size-18" weight="regular" />
      )}
    </button>
  )
}
