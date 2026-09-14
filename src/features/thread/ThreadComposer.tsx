import { ArrowRight, ArrowUp, Check, X } from '@phosphor-icons/react'
import { BorderBeam } from 'border-beam'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent, RefObject } from 'react'

import { MeasuredHeight } from './MeasuredHeight'
import type { FieldRecording } from './questionnaire/fieldPrimitives'
import { handlePaneKey } from './questionnaire/paneKeys'
import { QuestionFooter, QuestionPane } from './questionnaire/QuestionPane'
import type {
  QuestionKind,
  Questionnaire,
  SubmittedAnswer,
} from './questionnaire/questions'
import {
  useQuestionnaire,
  type QuestionnaireController,
} from './questionnaire/useQuestionnaire'
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
  /** When the agent asks, the composer becomes the form. */
  readonly questionnaire?: Questionnaire | null | undefined
  readonly onAnswers?: ((answers: readonly SubmittedAnswer[]) => void) | undefined
}

// Content swaps in place with a short fade so the send and microphone
// controls never move. The surface's height is animated by one owner.
const SWAP_TRANSITION = { duration: 0.16, ease: [0.2, 0, 0, 1] } as const
const SWAP_HIDDEN = { opacity: 0, filter: 'blur(4px)' } as const
const SWAP_VISIBLE = { opacity: 1, filter: 'blur(0px)' } as const
const ICON_HIDDEN = { opacity: 0, scale: 0.25, filter: 'blur(4px)' } as const
const ICON_VISIBLE = { opacity: 1, scale: 1, filter: 'blur(0px)' } as const
const ICON_TRANSITION = { type: 'spring', duration: 0.3, bounce: 0 } as const
const INSTANT = { duration: 0 } as const

type SendIcon = 'send' | 'next' | 'submit'
type SendControl = { readonly icon: SendIcon; readonly label: string }

function sendControl(
  recording: boolean,
  controller: QuestionnaireController | null,
): SendControl {
  if (recording) return { icon: 'send', label: 'Transcribe and send' }
  if (!controller) return { icon: 'send', label: 'Send message' }
  return controller.isLast
    ? { icon: 'submit', label: 'Send answers' }
    : { icon: 'next', label: 'Next question' }
}

/** One control whose icon morphs between send, next, and done without moving. */
function SendButton({
  icon,
  label,
  disabled,
  instant,
}: SendControl & { readonly disabled: boolean; readonly instant: boolean }) {
  return (
    <button
      aria-label={label}
      className="mb-2 grid size-36 shrink-0 place-items-center rounded-10 bg-heat-100 text-accent-white shadow-action-heat transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 disabled:bg-border-faint disabled:text-foreground-muted disabled:shadow-none"
      disabled={disabled}
      type="submit"
    >
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={icon}
          animate={ICON_VISIBLE}
          className="grid place-items-center"
          exit={ICON_HIDDEN}
          initial={ICON_HIDDEN}
          transition={instant ? INSTANT : ICON_TRANSITION}
        >
          {icon === 'submit' ? (
            <Check aria-hidden className="size-18" weight="bold" />
          ) : icon === 'next' ? (
            <ArrowRight aria-hidden className="size-18" weight="regular" />
          ) : (
            <ArrowUp aria-hidden className="size-18" weight="regular" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}

type ElementRef<T extends HTMLElement> = RefObject<T | null>

type VoiceState = ReturnType<typeof useVoiceTranscription>['state']

/** A live capture, handed to whichever field the transcript will land in. */
function recordingFrom(
  state: VoiceState,
  onDiscard: () => void,
): FieldRecording | null {
  return state.status === 'recording'
    ? { recorder: state.recorder, startedAt: state.startedAt, onDiscard }
    : null
}

function isSendDisabled(
  recording: FieldRecording | null,
  controller: QuestionnaireController | null,
  disabled: boolean,
  voiceBusy: boolean,
  canSend: boolean,
): boolean {
  if (recording) return disabled
  if (controller) return disabled || voiceBusy
  return !canSend
}

/** Drafting while the microphone is live: discard, then the level history. */
function RecordingRow({ recording }: { readonly recording: FieldRecording }) {
  return (
    <>
      <button
        aria-label="Discard voice recording"
        className="grid size-36 shrink-0 place-items-center rounded-10 text-foreground-muted transition-[background-color,color] duration-150 hover:bg-accent-black/4 hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100"
        type="button"
        onClick={recording.onDiscard}
      >
        <X aria-hidden className="size-18" weight="regular" />
      </button>
      <VoiceRecordingBar
        recorder={recording.recorder}
        startedAt={recording.startedAt}
      />
    </>
  )
}

/**
 * Where focus belongs for a question: its field, or the pane itself when the
 * answer is a list of options, so digits and type-to-start both work.
 */
function focusQuestion(
  kind: QuestionKind,
  entry: ElementRef<HTMLInputElement>,
  area: ElementRef<HTMLTextAreaElement>,
  pane: ElementRef<HTMLFieldSetElement>,
): void {
  const target =
    kind === 'text'
      ? area.current
      : kind === 'choice' || kind === 'when'
        ? pane.current
        : entry.current
  target?.focus({ preventScroll: true })
}

/** Focus follows the mode: the open question, or the draft when it returns. */
function useModeFocus(
  activeId: string | null,
  activeKind: QuestionKind | null,
  textarea: ElementRef<HTMLTextAreaElement>,
  entry: ElementRef<HTMLInputElement>,
  area: ElementRef<HTMLTextAreaElement>,
  pane: ElementRef<HTMLFieldSetElement>,
): void {
  const wasAsking = useRef(false)
  useEffect(() => {
    if (activeKind) {
      wasAsking.current = true
      focusQuestion(activeKind, entry, area, pane)
      return
    }
    if (wasAsking.current) {
      wasAsking.current = false
      textarea.current?.focus({ preventScroll: true })
    }
  }, [activeId, activeKind, textarea, entry, area, pane])
}

type DraftFieldProps = {
  readonly textareaRef: ElementRef<HTMLTextAreaElement>
  readonly value: string
  readonly disabled: boolean
  readonly readOnly: boolean
  readonly onChange: (value: string) => void
  readonly onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
}

function DraftField({
  textareaRef,
  value,
  disabled,
  readOnly,
  onChange,
  onKeyDown,
}: DraftFieldProps) {
  return (
    <>
      <label className="sr-only" htmlFor="found-message">
        Message Found
      </label>
      <textarea
        ref={textareaRef}
        id="found-message"
        className="min-h-40 min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-8 py-6 text-body-input text-accent-black outline-none placeholder:text-foreground-muted disabled:opacity-50"
        disabled={disabled}
        placeholder="Describe your next place…"
        readOnly={readOnly}
        rows={1}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
    </>
  )
}

export function ThreadComposer({
  disabled,
  showIdleBeam,
  value,
  onChange,
  onSubmit,
  questionnaire = null,
  onAnswers,
}: ThreadComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const entryRef = useRef<HTMLInputElement>(null)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const paneRef = useRef<HTMLFieldSetElement>(null)
  /** The question that was open when the microphone started. */
  const recordingFor = useRef<string | null>(null)
  const [interacted, setInteracted] = useState(false)
  const reducedMotion = useReducedMotion()
  const instant = reducedMotion === true

  const questionnaireController = useQuestionnaire(questionnaire, (answers) => {
    setInteracted(true)
    onAnswers?.(answers)
  })
  const voice = useVoiceTranscription((transcript, completion) => {
    if (controller) {
      controller.appendTranscript(
        transcript,
        completion === 'submit',
        recordingFor.current ?? undefined,
      )
      return
    }
    const prompt = appendTranscriptToDraft(value, transcript)
    setInteracted(true)
    if (completion === 'submit' && !disabled) {
      onSubmit(prompt)
      return
    }
    onChange(prompt)
    textareaRef.current?.focus()
  })

  const recording = voice.state.status === 'recording'
  const voiceBusy =
    voice.state.status !== 'idle' && voice.state.status !== 'error'
  // While a transcript is in flight, Next waits for it; Back and Skip stay
  // free because the transcript is bound to the question it was recorded on.
  const controller =
    questionnaireController && voiceBusy
      ? { ...questionnaireController, next: () => undefined }
      : questionnaireController
  const idle = !interacted && !disabled && !value && !controller
  const beamActive = showIdleBeam && idle && !instant
  const canSend = !disabled && !voiceBusy && value.trim().length > 0
  const swapTransition = instant ? INSTANT : SWAP_TRANSITION

  useModeFocus(
    controller?.question.id ?? null,
    controller?.question.kind ?? null,
    textareaRef,
    entryRef,
    areaRef,
    paneRef,
  )

  // The textarea sizes itself instantly; the surface around it does the moving.
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.min(160, Math.max(40, textarea.scrollHeight))}px`
  }, [value, recording])

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (recording) {
      voice.stopRecording('submit')
      return
    }
    if (controller) {
      if (voiceBusy) return
      controller.next()
      // A refused advance leaves focus on the send control; bring it back so
      // digits and typing keep working. A successful one refocuses via effect.
      focusQuestion(controller.question.kind, entryRef, areaRef, paneRef)
      return
    }
    if (!canSend) return
    setInteracted(true)
    onSubmit()
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      if (canSend) onSubmit()
    }
  }

  function handlePaneKeyDown(event: KeyboardEvent<HTMLFieldSetElement>): void {
    if (!controller) return
    handlePaneKey(event, controller, () =>
      (controller.question.kind === 'text'
        ? areaRef.current
        : entryRef.current
      )?.focus(),
    )
  }

  const send = sendControl(recording, controller)
  const fieldRecording = recordingFrom(voice.state, voice.cancelRecording)
  const sendDisabled = isSendDisabled(
    fieldRecording,
    controller,
    disabled,
    voiceBusy,
    canSend,
  )
  const controlRow = controller ? 'row-start-2' : 'row-start-1'

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
          aria-label={controller ? 'Answer the questions' : 'Message composer'}
          className="thread-composer relative rounded-20 bg-background-lighter p-12 shadow-surface-raised"
          onFocusCapture={() => setInteracted(true)}
          onSubmit={handleSubmit}
        >
          <MeasuredHeight instant={instant}>
            {/* One grid for both shapes. Asking, the content spans every
                column and the controls drop into the footer row; drafting,
                they share the textarea's row. Their position never changes. */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-end gap-x-8 gap-y-12">
              <AnimatePresence initial={false} mode="popLayout">
                {controller ? (
                  <motion.div
                    key="questionnaire"
                    animate={SWAP_VISIBLE}
                    className="col-span-3 col-start-1 row-start-1 min-w-0"
                    exit={SWAP_HIDDEN}
                    initial={SWAP_HIDDEN}
                    transition={swapTransition}
                  >
                    <QuestionPane
                      areaRef={areaRef}
                      controller={controller}
                      entryRef={entryRef}
                      paneRef={paneRef}
                      recording={fieldRecording}
                      reducedMotion={reducedMotion}
                      onKeyDown={handlePaneKeyDown}
                    />
                  </motion.div>
                ) : fieldRecording ? (
                  <motion.div
                    key="recording"
                    animate={SWAP_VISIBLE}
                    className="col-start-1 row-start-1 flex min-w-0 items-center gap-8"
                    exit={SWAP_HIDDEN}
                    initial={SWAP_HIDDEN}
                    transition={swapTransition}
                  >
                    <RecordingRow recording={fieldRecording} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="draft"
                    animate={SWAP_VISIBLE}
                    className="col-start-1 row-start-1 flex min-w-0"
                    exit={SWAP_HIDDEN}
                    initial={SWAP_HIDDEN}
                    transition={swapTransition}
                  >
                    <DraftField
                      disabled={disabled}
                      readOnly={voiceBusy}
                      textareaRef={textareaRef}
                      value={value}
                      onChange={(next) => {
                        setInteracted(true)
                        voice.dismissError()
                        onChange(next)
                      }}
                      onKeyDown={handleDraftKeyDown}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence initial={false} mode="popLayout">
                {controller ? (
                  <motion.div
                    key="footer"
                    animate={SWAP_VISIBLE}
                    className="col-start-1 row-start-2 min-w-0"
                    exit={SWAP_HIDDEN}
                    initial={SWAP_HIDDEN}
                    transition={swapTransition}
                  >
                    <QuestionFooter controller={controller} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
              {voice.supported ? (
                <div className={`col-start-2 flex ${controlRow}`}>
                  <VoiceInputButton
                    disabled={disabled}
                    state={voice.state}
                    onStart={() => {
                      setInteracted(true)
                      recordingFor.current = controller?.question.id ?? null
                      voice.startRecording()
                    }}
                    onStop={() => voice.stopRecording('draft')}
                  />
                </div>
              ) : null}
              <div className={`col-start-3 flex ${controlRow}`}>
                <SendButton
                  disabled={sendDisabled}
                  icon={send.icon}
                  instant={instant}
                  label={send.label}
                />
              </div>
            </div>
          </MeasuredHeight>
        </form>
      </BorderBeam>
    </>
  )
}
