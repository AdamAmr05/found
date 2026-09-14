import { Check, X } from '@phosphor-icons/react'
import { motion } from 'motion/react'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  KeyboardEvent,
  ReactNode,
  Ref,
} from 'react'

import { VoiceRecordingBar } from '../voice/VoiceRecordingBar'

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100'

/**
 * The composer is a 20px surface with 12px padding, so anything sitting
 * inside it is 8px, the same radius shadcn gives its rows and inputs.
 */
export const innerRadius = 'rounded-8'

const fieldSurface = `${innerRadius} border-1 border-border-faint bg-background-base transition-[border-color] duration-150 focus-within:border-border-loud`

/** A live recording shown inside the field the transcript will land in. */
export type FieldRecording = {
  readonly recorder: MediaRecorder
  readonly startedAt: number
  readonly onDiscard: () => void
}

function RecordingInField({ recording }: { readonly recording: FieldRecording }) {
  return (
    <div className="flex min-w-0 flex-1 items-center">
      <button
        aria-label="Discard voice recording"
        className={`grid size-32 shrink-0 place-items-center rounded-6 text-foreground-muted transition-[background-color,color] duration-150 hover:bg-accent-black/4 hover:text-accent-black ${focusRing}`}
        type="button"
        onClick={recording.onDiscard}
      >
        <X aria-hidden className="size-16" weight="regular" />
      </button>
      <VoiceRecordingBar
        recorder={recording.recorder}
        startedAt={recording.startedAt}
      />
    </div>
  )
}

type TextEntryProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className'
> & {
  readonly entryRef?: Ref<HTMLInputElement> | undefined
  readonly leading?: ReactNode
  readonly trailing?: ReactNode
  readonly recording?: FieldRecording | null | undefined
  readonly className?: string
}

/**
 * A quiet field: a faint edge that strengthens on focus, never a heavy box,
 * so it reads as part of the composer rather than a form dropped into it.
 * While the microphone is live the wave and timer sit inside this same box.
 */
export function TextEntry({
  entryRef,
  leading,
  trailing,
  recording,
  className = '',
  ...props
}: TextEntryProps) {
  return (
    <label
      className={`flex min-h-44 min-w-0 items-center gap-6 px-12 ${fieldSurface} ${className}`}
    >
      {recording ? (
        <RecordingInField recording={recording} />
      ) : (
        <>
          {leading ? (
            <span className="flex shrink-0 items-center text-body-input text-foreground-muted">
              {leading}
            </span>
          ) : null}
          <input
            ref={entryRef}
            className="min-w-0 flex-1 bg-transparent py-8 text-body-input text-accent-black outline-none placeholder:text-foreground-muted"
            {...props}
          />
          {trailing ? (
            <span className="shrink-0 text-body-medium text-foreground-muted">
              {trailing}
            </span>
          ) : null}
        </>
      )}
    </label>
  )
}

type TextAreaEntryProps = {
  readonly areaRef: Ref<HTMLTextAreaElement>
  readonly label: string
  readonly placeholder: string
  readonly value: string
  readonly recording?: FieldRecording | null | undefined
  readonly onChange: (value: string) => void
  readonly onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
}

export function TextAreaEntry({
  areaRef,
  label,
  placeholder,
  value,
  recording,
  onChange,
  onKeyDown,
}: TextAreaEntryProps) {
  return (
    <label className={`flex min-h-44 min-w-0 px-12 ${fieldSurface}`}>
      <span className="sr-only">{label}</span>
      {recording ? (
        <RecordingInField recording={recording} />
      ) : (
        <textarea
          ref={areaRef}
          className="max-h-160 min-h-64 min-w-0 flex-1 resize-none bg-transparent py-8 text-body-input text-accent-black outline-none field-sizing-content placeholder:text-foreground-muted"
          placeholder={placeholder}
          rows={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
      )}
    </label>
  )
}

type ChoiceRowProps = {
  readonly name: string
  readonly value: string
  readonly checked: boolean
  readonly multiple: boolean
  readonly label: string
  readonly description?: string | undefined
  readonly shortcut?: string | undefined
  readonly onToggle: () => void
}

/**
 * shadcn's questionnaire row: a native radio or checkbox under a bordered
 * label, an indicator, the label with an optional description, and the
 * shortcut badge at the end. Rows stack; they never sit side by side.
 */
export function ChoiceRow({
  name,
  value,
  checked,
  multiple,
  label,
  description,
  shortcut,
  onToggle,
}: ChoiceRowProps) {
  const surface = checked
    ? 'border-heat-100/40 bg-heat-4'
    : 'border-border-muted hover:bg-black/2'
  const indicator = checked
    ? 'border-heat-100 bg-heat-100 text-white'
    : 'border-border-loud bg-white'

  return (
    <label
      className={`relative flex min-h-44 cursor-pointer items-start gap-10 ${innerRadius} border-1 px-12 py-10 text-body-medium text-accent-black transition-[border-color,background-color] duration-150 select-none has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-heat-100 ${surface}`}
    >
      <input
        checked={checked}
        className="absolute inset-0 z-10 size-full cursor-pointer opacity-0"
        name={name}
        type={multiple ? 'checkbox' : 'radio'}
        value={value}
        onChange={onToggle}
        onClick={multiple ? undefined : onToggle}
      />
      <span
        aria-hidden
        className={`pointer-events-none mt-2 grid size-16 shrink-0 place-items-center border-1 transition-[border-color,background-color] duration-150 ${multiple ? 'rounded-4' : 'rounded-full'} ${indicator}`}
      >
        {checked ? (
          multiple ? (
            <Check className="size-11" weight="bold" />
          ) : (
            <span className="size-6 rounded-full bg-white" />
          )
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-pretty">{label}</span>
        {description ? (
          <span className="text-body-small text-foreground-muted">
            {description}
          </span>
        ) : null}
      </span>
      {shortcut ? (
        <kbd className="pointer-events-none mt-2 grid size-20 shrink-0 place-items-center rounded-6 border-1 border-border-muted bg-white font-mono text-mono-x-small leading-none text-foreground-muted">
          {shortcut}
        </kbd>
      ) : null}
    </label>
  )
}

type SegmentedProps<T extends string> = {
  readonly id: string
  readonly label: string
  readonly value: T
  readonly options: readonly { readonly value: T; readonly label: string }[]
  readonly onChange: (value: T) => void
}

export function Segmented<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <fieldset
      className={`inline-flex gap-2 self-start ${innerRadius} bg-black/4 p-2`}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            className={`relative min-h-28 rounded-6 px-10 text-label-small transition-[color] duration-150 ${focusRing} ${active ? 'text-accent-black' : 'text-foreground-muted hover:text-accent-black'}`}
            onClick={() => onChange(option.value)}
          >
            {active ? (
              <motion.span
                aria-hidden
                layoutId={`${id}-thumb`}
                className="absolute inset-0 rounded-6 bg-white shadow-surface-compact"
                transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.7 }}
              />
            ) : null}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </fieldset>
  )
}

/** Footer actions, Back and Skip: text, not chrome. */
export function QuietButton({
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-36 items-center gap-4 rounded-6 px-8 text-label-small text-foreground-muted transition-[color] duration-150 hover:text-accent-black disabled:opacity-50 ${focusRing} ${className}`}
      {...props}
    />
  )
}
