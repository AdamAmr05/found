/**
 * The questionnaire the agent calls when two or more unknowns block a useful
 * search. Six question kinds, each keeping a free-text slot: the model is the
 * parser, so every answer is a string it can read, and the client only parses
 * where that helps the control itself.
 */

import type { AskQuestionsInput } from '../../../../shared/foundTools'

/** The agent composes these; the shared zod schema is the contract. */
export type Question = AskQuestionsInput['questions'][number]
export type QuestionKind = Question['kind']
export type ChoiceQuestion = Extract<Question, { kind: 'choice' }>
export type NumberQuestion = Extract<Question, { kind: 'number' }>
export type AmountQuestion = Extract<Question, { kind: 'amount' }>
export type LocationQuestion = Extract<Question, { kind: 'location' }>
export type WhenQuestion = Extract<Question, { kind: 'when' }>
export type TextQuestion = Extract<Question, { kind: 'text' }>
export type AmountMode = AmountQuestion['prefill'] extends
  | { readonly mode: infer M }
  | undefined
  ? M
  : never

/** One askQuestions call: its tool call id and the questions it carried. */
export type Questionnaire = {
  readonly id: string
  readonly questions: readonly Question[]
}

export type Answer =
  | {
      readonly kind: 'choice'
      readonly selected: readonly string[]
      readonly text: string
    }
  | { readonly kind: 'number'; readonly text: string }
  | {
      readonly kind: 'amount'
      readonly mode: AmountMode
      readonly low: string
      readonly high: string
    }
  | { readonly kind: 'location'; readonly text: string }
  | {
      readonly kind: 'when'
      readonly option: string | null
      readonly text: string
    }
  | { readonly kind: 'text'; readonly text: string }

export type AnswerStatus = 'unanswered' | 'answered' | 'skipped'

export function initialAnswer(question: Question): Answer {
  switch (question.kind) {
    case 'choice':
      return { kind: 'choice', selected: question.prefill ?? [], text: '' }
    case 'number':
      return { kind: 'number', text: question.prefill?.toString() ?? '' }
    case 'amount':
      return {
        kind: 'amount',
        mode: question.prefill?.mode ?? 'upto',
        low: question.prefill?.low ?? '',
        high: question.prefill?.high ?? '',
      }
    case 'location':
      return { kind: 'location', text: question.prefill ?? '' }
    case 'when':
      return { kind: 'when', option: question.prefill ?? null, text: '' }
    case 'text':
      return { kind: 'text', text: question.prefill ?? '' }
  }
}

function labelFor(question: ChoiceQuestion, value: string): string {
  return (
    question.options.find((option) => option.value === value)?.label ?? value
  )
}

function joinParts(parts: readonly string[]): string | null {
  const kept = parts
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
  return kept.length > 0 ? kept.join(', ') : null
}

function choiceText(
  question: ChoiceQuestion,
  answer: Extract<Answer, { kind: 'choice' }>,
): string | null {
  const labels = answer.selected.map((value) => labelFor(question, value))
  return joinParts([...labels, answer.text])
}

function amountText(
  question: AmountQuestion,
  answer: Extract<Answer, { kind: 'amount' }>,
): string | null {
  const per = question.per ? ` per ${question.per}` : ''
  const low = answer.mode === 'between' ? answer.low.trim() : ''
  const high = answer.high.trim()
  if (low && high) return `${low} to ${high}${per}`
  if (high) return `up to ${high}${per}`
  if (low) return `from ${low}${per}`
  return null
}

/**
 * The answer as the model will read it. Returns null when there is nothing to
 * say, which the caller reports as skipped.
 */
export function answerText(question: Question, answer: Answer): string | null {
  if (question.kind === 'choice' && answer.kind === 'choice') {
    return choiceText(question, answer)
  }
  if (question.kind === 'amount' && answer.kind === 'amount') {
    return amountText(question, answer)
  }
  if (question.kind === 'number' && answer.kind === 'number') {
    const typed = answer.text.trim()
    return typed ? `${typed} ${question.unit}` : null
  }
  if (answer.kind === 'when') {
    return joinParts([answer.option ?? '', answer.text])
  }
  if (answer.kind === 'location' || answer.kind === 'text') {
    return joinParts([answer.text])
  }
  return null
}

export function isAnswered(question: Question, answer: Answer): boolean {
  return answerText(question, answer) !== null
}

/** Every kind has one free-text slot. Typing and voice both land here. */
export function freeText(answer: Answer): string {
  return answer.kind === 'amount' ? answer.high : answer.text
}

export function withFreeText(answer: Answer, text: string): Answer {
  return answer.kind === 'amount'
    ? { ...answer, high: text }
    : { ...answer, text }
}

export function applyTranscript(answer: Answer, transcript: string): Answer {
  const text = transcript.trim()
  if (!text) return answer
  const current = freeText(answer)
  const joined =
    current.length === 0
      ? text
      : `${current}${/\s$/u.test(current) ? '' : ' '}${text}`
  return withFreeText(answer, joined)
}

/** The values digit shortcuts pick, in order, for kinds that list options. */
export function optionValues(question: Question): readonly string[] {
  switch (question.kind) {
    case 'choice':
      return question.options.map((option) => option.value)
    case 'when':
      return question.options
    default:
      return []
  }
}

export function toggleOption(
  question: Question,
  answer: Answer,
  value: string,
): Answer {
  if (question.kind === 'choice' && answer.kind === 'choice') {
    const has = answer.selected.includes(value)
    if (question.multiple) {
      return {
        ...answer,
        selected: has
          ? answer.selected.filter((entry) => entry !== value)
          : [...answer.selected, value],
      }
    }
    return { ...answer, selected: has ? [] : [value] }
  }
  if (question.kind === 'when' && answer.kind === 'when') {
    return { ...answer, option: answer.option === value ? null : value }
  }
  return answer
}

export type SubmittedAnswer = {
  readonly question: Question
  readonly status: AnswerStatus
  readonly text: string | null
}

const ANSWERS_HEADING = 'Answers to your questions:'
const ANSWERS_CAUTION =
  'Read these carefully. A typed answer may narrow, widen, or change what was asked.'
const SKIPPED = '(skipped)'

/** One answered question as the transcript shows it. */
export type AnswerChip = {
  readonly id: string
  readonly header: string
  readonly text: string | null
}

export function chipsFromAnswers(
  answers: readonly SubmittedAnswer[],
): readonly AnswerChip[] {
  return answers.map(({ question, text }) => ({
    id: question.id,
    header: question.header,
    text,
  }))
}

/**
 * The user message the model receives. Prose rather than JSON: it reads as
 * something the user said, and it ends with the same caution AskUserQuestion
 * carries, because a typed answer may be a change of mind.
 */
export function formatAnswersMessage(
  answers: readonly SubmittedAnswer[],
): string {
  const lines = answers.map(
    ({ question, text }) => `${question.header}: ${text ?? SKIPPED}`,
  )
  return [ANSWERS_HEADING, ...lines, ANSWERS_CAUTION].join('\n')
}

/**
 * Reads that message back so the transcript can show chips instead of prose.
 * Anything that does not match the exact shape renders as ordinary text.
 */
export function parseAnswersMessage(text: string): readonly AnswerChip[] | null {
  const lines = text.split('\n')
  if (lines[0] !== ANSWERS_HEADING) return null
  const chips: AnswerChip[] = []
  for (const line of lines.slice(1)) {
    if (line === ANSWERS_CAUTION) break
    const split = line.indexOf(': ')
    if (split <= 0) return null
    const header = line.slice(0, split)
    const value = line.slice(split + 2)
    chips.push({
      id: `${chips.length}-${header}`,
      header,
      text: value === SKIPPED ? null : value,
    })
  }
  return chips.length > 0 ? chips : null
}
