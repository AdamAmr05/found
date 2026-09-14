import { describe, expect, it } from 'vitest'

import {
  answerText,
  applyTranscript,
  formatAnswersMessage,
  initialAnswer,
  parseAnswersMessage,
  toggleOption,
  type Question,
} from './questions'

const budget: Question = {
  id: 'budget',
  kind: 'amount',
  header: 'Budget',
  prompt: 'What can you spend each month?',
  per: 'month',
  prefill: { mode: 'upto', high: '1,000' },
}

const type: Question = {
  id: 'type',
  kind: 'choice',
  header: 'Type',
  prompt: 'What kind of place?',
  options: [
    { value: 'flat', label: 'Whole flat' },
    { value: 'room', label: 'Room' },
  ],
}

describe('answerText', () => {
  it('keeps money as the user wrote it, currency included', () => {
    expect(answerText(budget, initialAnswer(budget))).toBe(
      'up to 1,000 per month',
    )
    expect(
      answerText(budget, { kind: 'amount', mode: 'upto', low: '', high: '$1500' }),
    ).toBe('up to $1500 per month')
    expect(
      answerText(budget, { kind: 'amount', mode: 'between', low: '800', high: '1200' }),
    ).toBe('800 to 1200 per month')
  })

  it('joins picked labels with typed text and reports nothing as null', () => {
    const picked = toggleOption(type, initialAnswer(type), 'room')
    expect(answerText(type, picked)).toBe('Room')
    expect(answerText(type, applyTranscript(picked, 'near the canal'))).toBe(
      'Room, near the canal',
    )
    expect(answerText(type, initialAnswer(type))).toBeNull()
  })
})

describe('answers message', () => {
  it('round-trips through the transcript chips', () => {
    const message = formatAnswersMessage([
      { question: budget, status: 'answered', text: 'up to 1,000 per month' },
      { question: type, status: 'skipped', text: null },
    ])
    expect(message.split('\n')[0]).toBe('Answers to your questions:')
    expect(parseAnswersMessage(message)).toEqual([
      { id: '0-Budget', header: 'Budget', text: 'up to 1,000 per month' },
      { id: '1-Type', header: 'Type', text: null },
    ])
  })

  it('leaves ordinary messages alone', () => {
    expect(parseAnswersMessage('Somewhere near the canal')).toBeNull()
    expect(parseAnswersMessage('Answers to your questions:\nno colon')).toBeNull()
  })
})
