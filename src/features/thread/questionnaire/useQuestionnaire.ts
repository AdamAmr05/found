import { useState } from 'react'

import {
  answerText,
  applyTranscript,
  initialAnswer,
  isAnswered,
  type Answer,
  type AnswerStatus,
  type Question,
  type Questionnaire,
  type SubmittedAnswer,
} from './questions'

type Entry = {
  readonly answer: Answer
  readonly status: AnswerStatus
}

type State = {
  /** Which questionnaire these entries belong to; a new id resets everything. */
  readonly forId: string | null
  readonly index: number
  readonly entries: Readonly<Record<string, Entry>>
  readonly error: string | null
}

function initialState(questionnaire: Questionnaire | null): State {
  const entries: Record<string, Entry> = {}
  for (const question of questionnaire?.questions ?? []) {
    const answer = initialAnswer(question)
    entries[question.id] = {
      answer,
      status: isAnswered(question, answer) ? 'answered' : 'unanswered',
    }
  }
  return { forId: questionnaire?.id ?? null, index: 0, entries, error: null }
}

function entryFor(state: State, question: Question): Entry {
  return (
    state.entries[question.id] ?? {
      answer: initialAnswer(question),
      status: 'unanswered',
    }
  )
}

export type QuestionnaireController = {
  readonly questionnaire: Questionnaire
  readonly question: Question
  readonly index: number
  readonly count: number
  readonly isLast: boolean
  readonly answer: Answer
  readonly answered: boolean
  readonly error: string | null
  readonly statuses: readonly AnswerStatus[]
  readonly setAnswer: (answer: Answer) => void
  /** Voice lands in the free-text slot; `advanceAfter` is Transcribe and send. */
  readonly appendTranscript: (transcript: string, advanceAfter?: boolean) => void
  readonly next: () => void
  readonly skip: () => void
  readonly previous: () => void
  readonly goTo: (index: number) => void
}

/**
 * Owns the ordered questions, the active one, every answer, and validation.
 * The composer around it owns transport and dismissal, as in shadcn's split.
 * Accepts null so the composer can keep one hook across both of its modes;
 * a change of questionnaire id resets the state during render.
 */
export function useQuestionnaire(
  questionnaire: Questionnaire | null,
  onSubmit: (answers: readonly SubmittedAnswer[]) => void,
): QuestionnaireController | null {
  const [stored, setState] = useState(() => initialState(questionnaire))
  const stale = stored.forId !== (questionnaire?.id ?? null)
  const state = stale ? initialState(questionnaire) : stored
  if (stale) setState(state)

  if (!questionnaire) return null
  const questions = questionnaire.questions
  const question = questions[state.index] ?? questions[0]
  if (!question) return null

  const entry = entryFor(state, question)
  const isLast = state.index === questions.length - 1
  const answered = isAnswered(question, entry.answer)

  function setAnswer(answer: Answer): void {
    if (!question) return
    setState((current) => ({
      ...current,
      error: null,
      entries: {
        ...current.entries,
        [question.id]: {
          answer,
          status: isAnswered(question, answer) ? 'answered' : 'unanswered',
        },
      },
    }))
  }

  function submitted(final: State): readonly SubmittedAnswer[] {
    return questions.map((each) => {
      const { answer, status } = entryFor(final, each)
      const text = answerText(each, answer)
      return { question: each, status: text === null ? 'skipped' : status, text }
    })
  }

  /**
   * Takes the answer explicitly so a voice transcript can land and advance in
   * one step, without waiting a render for the closure to catch up.
   */
  function advance(skipping: boolean, answer: Answer = entry.answer): void {
    if (!question) return
    const complete = isAnswered(question, answer)
    if (!skipping && question.required && !complete) {
      setState((current) => ({
        ...current,
        error: 'Pick one or type an answer to continue.',
      }))
      return
    }
    const entries = {
      ...state.entries,
      [question.id]: {
        answer,
        status: complete ? 'answered' : 'skipped',
      } satisfies Entry,
    }
    if (isLast) {
      onSubmit(submitted({ ...state, entries }))
      return
    }
    setState({ ...state, index: state.index + 1, entries, error: null })
  }

  return {
    questionnaire,
    question,
    index: state.index,
    count: questions.length,
    isLast,
    answer: entry.answer,
    answered,
    error: state.error,
    statuses: questions.map((each) => entryFor(state, each).status),
    setAnswer,
    appendTranscript: (transcript, advanceAfter = false) => {
      const answer = applyTranscript(entry.answer, transcript)
      if (advanceAfter) advance(false, answer)
      else setAnswer(answer)
    },
    next: () => advance(false),
    skip: () => advance(true),
    previous: () =>
      setState((current) => ({
        ...current,
        error: null,
        index: Math.max(0, current.index - 1),
      })),
    goTo: (index) =>
      setState((current) => ({
        ...current,
        error: null,
        index: Math.min(questions.length - 1, Math.max(0, index)),
      })),
  }
}
