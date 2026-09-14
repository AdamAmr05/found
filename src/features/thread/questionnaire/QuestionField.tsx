import { CalendarBlank, MapPin, Minus, Plus } from '@phosphor-icons/react'
import type { KeyboardEvent, Ref } from 'react'

import {
  ChoiceRow,
  focusRing,
  innerRadius,
  Segmented,
  TextAreaEntry,
  TextEntry,
  type FieldRecording,
} from './fieldPrimitives'
import {
  toggleOption,
  type AmountQuestion,
  type Answer,
  type ChoiceQuestion,
  type LocationQuestion,
  type NumberQuestion,
  type Question,
  type WhenQuestion,
} from './questions'

/** A number the stepper can read. Anything else stays as typed. */
function parseLoose(text: string): number | null {
  const parsed = Number(text.replace(/[,\s]/gu, ''))
  return text.trim() !== '' && Number.isFinite(parsed) ? parsed : null
}

function shortcutFor(index: number): string | undefined {
  return index < 9 ? String(index + 1) : undefined
}

type FieldProps<Q extends Question, A extends Answer> = {
  readonly question: Q
  readonly answer: A
  readonly recording: FieldRecording | null
  readonly onChange: (answer: Answer) => void
  readonly onEnter: () => void
  readonly entryRef: Ref<HTMLInputElement>
}

function enterAdvances(onEnter: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      onEnter()
    }
  }
}

function ChoiceField({
  question,
  answer,
  recording,
  onChange,
  onEnter,
  entryRef,
}: FieldProps<ChoiceQuestion, Extract<Answer, { kind: 'choice' }>>) {
  return (
    <fieldset className="grid min-w-0 gap-8">
      <legend className="sr-only">{question.prompt}</legend>
      {question.options.map((option, index) => (
        <ChoiceRow
          key={option.value}
          checked={answer.selected.includes(option.value)}
          description={option.description}
          label={option.label}
          multiple={question.multiple === true}
          name={question.id}
          shortcut={shortcutFor(index)}
          value={option.value}
          onToggle={() => onChange(toggleOption(question, answer, option.value))}
        />
      ))}
      <TextEntry
        entryRef={entryRef}
        aria-label="Another answer"
        placeholder={question.multiple ? 'Something else…' : 'Or type your own…'}
        recording={recording}
        value={answer.text}
        onChange={(event) => onChange({ ...answer, text: event.target.value })}
        onKeyDown={enterAdvances(onEnter)}
      />
    </fieldset>
  )
}

function WhenField({
  question,
  answer,
  recording,
  onChange,
  onEnter,
  entryRef,
}: FieldProps<WhenQuestion, Extract<Answer, { kind: 'when' }>>) {
  return (
    <fieldset className="grid min-w-0 gap-8">
      <legend className="sr-only">{question.prompt}</legend>
      {question.options.map((option, index) => (
        <ChoiceRow
          key={option}
          checked={answer.option === option}
          label={option}
          multiple={false}
          name={question.id}
          shortcut={shortcutFor(index)}
          value={option}
          onToggle={() => onChange(toggleOption(question, answer, option))}
        />
      ))}
      <TextEntry
        entryRef={entryRef}
        aria-label="A specific date"
        leading={<CalendarBlank aria-hidden className="size-16" weight="regular" />}
        placeholder="Or a date, like from 1 November…"
        recording={recording}
        value={answer.text}
        onChange={(event) => onChange({ ...answer, text: event.target.value })}
        onKeyDown={enterAdvances(onEnter)}
      />
    </fieldset>
  )
}

function NumberField({
  question,
  answer,
  recording,
  onChange,
  onEnter,
  entryRef,
}: FieldProps<NumberQuestion, Extract<Answer, { kind: 'number' }>>) {
  const min = question.min ?? 0
  const max = question.max ?? Number.POSITIVE_INFINITY
  const current = parseLoose(answer.text)

  function step(delta: number): void {
    const base = current ?? (delta > 0 ? min - 1 : min + 1)
    const next = Math.min(max, Math.max(min, base + delta))
    onChange({ ...answer, text: String(next) })
  }

  const stepButton = `grid size-44 shrink-0 place-items-center ${innerRadius} border-1 border-border-muted text-accent-black transition-[scale,border-color] duration-150 ease-out hover:border-border-loud active:not-disabled:scale-[0.96] disabled:opacity-40 ${focusRing}`

  return (
    <div className="flex flex-wrap items-center gap-8">
      <button
        type="button"
        aria-label="Fewer"
        className={stepButton}
        disabled={current !== null && current <= min}
        onClick={() => step(-1)}
      >
        <Minus aria-hidden className="size-16" weight="regular" />
      </button>
      <TextEntry
        entryRef={entryRef}
        aria-label={question.prompt}
        className={recording ? 'min-w-0 flex-1' : 'w-96 shrink-0 text-center'}
        inputMode="numeric"
        placeholder="—"
        recording={recording}
        value={answer.text}
        onChange={(event) => onChange({ ...answer, text: event.target.value })}
        onKeyDown={enterAdvances(onEnter)}
      />
      <button
        type="button"
        aria-label="More"
        className={stepButton}
        disabled={current !== null && current >= max}
        onClick={() => step(1)}
      >
        <Plus aria-hidden className="size-16" weight="regular" />
      </button>
      <span className="text-body-medium text-foreground-muted">
        {question.unit}
      </span>
    </div>
  )
}

function AmountField({
  question,
  answer,
  recording,
  onChange,
  onEnter,
  entryRef,
}: FieldProps<AmountQuestion, Extract<Answer, { kind: 'amount' }>>) {
  const per = question.per ? `per ${question.per}` : undefined
  const between = answer.mode === 'between'
  return (
    <div className="flex flex-col gap-12">
      <Segmented
        id={question.id}
        label="Budget shape"
        options={[
          { value: 'upto', label: 'Up to' },
          { value: 'between', label: 'Between' },
        ]}
        value={answer.mode}
        onChange={(mode) => onChange({ ...answer, mode })}
      />
      <div className="flex flex-wrap items-center gap-8">
        {between ? (
          <>
            <TextEntry
              aria-label="Lowest amount"
              className="w-160"
              inputMode="decimal"
              placeholder="800"
              value={answer.low}
              onChange={(event) => onChange({ ...answer, low: event.target.value })}
              onKeyDown={enterAdvances(onEnter)}
            />
            <span className="text-body-medium text-foreground-muted">to</span>
          </>
        ) : null}
        <TextEntry
          entryRef={entryRef}
          aria-label={between ? 'Highest amount' : 'Ceiling'}
          className={between && !recording ? 'w-160' : 'min-w-0 flex-1'}
          inputMode="decimal"
          placeholder={between ? '1,200' : '1,200, or $1,500…'}
          recording={recording}
          trailing={per}
          value={answer.high}
          onChange={(event) => onChange({ ...answer, high: event.target.value })}
          onKeyDown={enterAdvances(onEnter)}
        />
      </div>
    </div>
  )
}

function LocationField({
  question,
  answer,
  recording,
  onChange,
  onEnter,
  entryRef,
}: FieldProps<LocationQuestion, Extract<Answer, { kind: 'location' }>>) {
  return (
    <TextEntry
      entryRef={entryRef}
      aria-label={question.prompt}
      leading={<MapPin aria-hidden className="size-16" weight="regular" />}
      placeholder="A neighbourhood, a city, or near somewhere…"
      recording={recording}
      value={answer.text}
      onChange={(event) => onChange({ ...answer, text: event.target.value })}
      onKeyDown={enterAdvances(onEnter)}
    />
  )
}

type QuestionFieldProps = {
  readonly question: Question
  readonly answer: Answer
  readonly recording: FieldRecording | null
  readonly onChange: (answer: Answer) => void
  readonly onEnter: () => void
  readonly entryRef: Ref<HTMLInputElement>
  readonly areaRef: Ref<HTMLTextAreaElement>
}

export function QuestionField({
  question,
  answer,
  recording,
  onChange,
  onEnter,
  entryRef,
  areaRef,
}: QuestionFieldProps) {
  const shared = { recording, onChange, onEnter, entryRef }
  switch (question.kind) {
    case 'choice':
      return answer.kind === 'choice' ? (
        <ChoiceField question={question} answer={answer} {...shared} />
      ) : null
    case 'when':
      return answer.kind === 'when' ? (
        <WhenField question={question} answer={answer} {...shared} />
      ) : null
    case 'number':
      return answer.kind === 'number' ? (
        <NumberField question={question} answer={answer} {...shared} />
      ) : null
    case 'amount':
      return answer.kind === 'amount' ? (
        <AmountField question={question} answer={answer} {...shared} />
      ) : null
    case 'location':
      return answer.kind === 'location' ? (
        <LocationField question={question} answer={answer} {...shared} />
      ) : null
    case 'text':
      return answer.kind === 'text' ? (
        <TextAreaEntry
          areaRef={areaRef}
          label={question.prompt}
          placeholder={question.placeholder ?? 'Type or talk…'}
          recording={recording}
          value={answer.text}
          onChange={(text) => onChange({ ...answer, text })}
          onKeyDown={enterAdvances(onEnter)}
        />
      ) : null
  }
}
