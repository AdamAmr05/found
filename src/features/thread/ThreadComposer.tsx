import { ArrowUp, X } from '@phosphor-icons/react'
import { BorderBeam } from 'border-beam'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

import {
  appendTranscriptToDraft,
  useVoiceTranscription,
} from './voice/useVoiceTranscription'
import { VoiceInputButton } from './voice/VoiceInputButton'
import { VoiceRecordingBar } from './voice/VoiceRecordingBar'

interface ThreadComposerProps {
  readonly disabled: boolean
  readonly showIdleBeam: boolean
  readonly value: string
  readonly onChange: (value: string) => void
  readonly onSubmit: (promptOverride?: string) => void
}

// The draft and the live recording swap in place with a short fade so the
// send and microphone controls never move.
const SWAP_TRANSITION = { duration: 0.16, ease: [0.2, 0, 0, 1] } as const
const SWAP_HIDDEN = { opacity: 0, filter: 'blur(4px)' } as const
const SWAP_VISIBLE = { opacity: 1, filter: 'blur(0px)' } as const

export function ThreadComposer({
  disabled,
  showIdleBeam,
  value,
  onChange,
  onSubmit,
}: ThreadComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [interacted, setInteracted] = useState(false)
  const reducedMotion = useReducedMotion()
  const voice = useVoiceTranscription((transcript, completion) => {
    const prompt = appendTranscriptToDraft(value, transcript)
    if (completion === 'submit' && !disabled) {
      setInteracted(true)
      onSubmit(prompt)
      return
    }
    onChange(prompt)
    textareaRef.current?.focus()
  })
  const recording = voice.state.status === 'recording'
  const voiceBusy =
    voice.state.status !== 'idle' && voice.state.status !== 'error'
  const beamActive =
    showIdleBeam &&
    !interacted &&
    !disabled &&
    !value &&
    reducedMotion === false
  const canSend = !disabled && !voiceBusy && value.trim().length > 0
  const swapTransition = reducedMotion ? { duration: 0 } : SWAP_TRANSITION

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const currentHeight = textarea.getBoundingClientRect().height
    const transition = textarea.style.transition
    textarea.style.transition = 'none'
    textarea.style.minHeight = '0px'
    textarea.style.height = '0px'
    const nextHeight = Math.min(160, Math.max(40, textarea.scrollHeight))
    textarea.style.minHeight = ''
    textarea.style.height = `${currentHeight}px`
    void textarea.offsetHeight
    textarea.style.transition = transition

    const frame = requestAnimationFrame(() => {
      textarea.style.height = `${nextHeight}px`
    })
    return () => cancelAnimationFrame(frame)
    // The textarea remounts after a recording, so it is measured again then.
  }, [value, recording])

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (recording) {
      voice.stopRecording('submit')
      return
    }
    if (!canSend) return
    setInteracted(true)
    onSubmit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      if (canSend) onSubmit()
    }
  }

  return (
    <>
      {voice.state.status === 'error' ? (
        <p className="mb-10 text-body-small text-accent-crimson" role="alert">
          {voice.state.message}
        </p>
      ) : null}
      <BorderBeam
        active={beamActive}
        borderRadius={20}
        className="thread-composer-beam"
        colorVariant="sunset"
        duration={3.8}
        size="md"
        staticColors
        strength={0.6}
        theme="light"
      >
        <form
          aria-label="Message composer"
          className="thread-composer relative flex items-end gap-8 rounded-20 bg-background-lighter p-12 shadow-surface-raised"
          onFocusCapture={() => setInteracted(true)}
          onSubmit={handleSubmit}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {voice.state.status === 'recording' ? (
              <motion.div
                key="recording"
                animate={SWAP_VISIBLE}
                className="flex min-w-0 flex-1 items-center gap-8"
                exit={SWAP_HIDDEN}
                initial={SWAP_HIDDEN}
                transition={swapTransition}
              >
                <button
                  aria-label="Discard voice recording"
                  className="grid size-36 shrink-0 place-items-center rounded-10 text-foreground-muted transition-[background-color,color] duration-150 hover:bg-accent-black/4 hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100"
                  type="button"
                  onClick={voice.cancelRecording}
                >
                  <X aria-hidden className="size-18" weight="regular" />
                </button>
                <VoiceRecordingBar
                  recorder={voice.state.recorder}
                  startedAt={voice.state.startedAt}
                />
              </motion.div>
            ) : (
              <motion.div
                key="draft"
                animate={SWAP_VISIBLE}
                className="flex min-w-0 flex-1"
                exit={SWAP_HIDDEN}
                initial={SWAP_HIDDEN}
                transition={swapTransition}
              >
                <label className="sr-only" htmlFor="found-message">
                  Message Found
                </label>
                <textarea
                  ref={textareaRef}
                  id="found-message"
                  className="min-h-40 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-8 py-6 text-body-input text-accent-black transition-[height] duration-200 ease-[cubic-bezier(0.2,0,0,1)] outline-none placeholder:text-foreground-muted disabled:opacity-50 motion-reduce:transition-none"
                  disabled={disabled}
                  placeholder="Describe your next place…"
                  readOnly={voiceBusy}
                  rows={1}
                  value={value}
                  onChange={(event) => {
                    setInteracted(true)
                    voice.dismissError()
                    onChange(event.target.value)
                  }}
                  onKeyDown={handleKeyDown}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {voice.supported ? (
            <VoiceInputButton
              disabled={disabled}
              state={voice.state}
              onStart={() => {
                setInteracted(true)
                voice.startRecording()
              }}
              onStop={() => voice.stopRecording('draft')}
            />
          ) : null}
          <button
            aria-label={recording ? 'Transcribe and send' : 'Send message'}
            className="mb-2 grid size-36 shrink-0 place-items-center rounded-10 bg-heat-100 text-accent-white shadow-action-heat transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 disabled:bg-border-faint disabled:text-foreground-muted disabled:shadow-none"
            disabled={recording ? disabled : !canSend}
            type="submit"
          >
            <ArrowUp aria-hidden className="size-18" weight="regular" />
          </button>
        </form>
      </BorderBeam>
    </>
  )
}
