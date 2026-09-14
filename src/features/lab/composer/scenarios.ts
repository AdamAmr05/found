import type {
  Question,
  Questionnaire,
} from '~/features/thread/questionnaire/questions'

/**
 * Scripted arrivals. One per kind so each control can be judged alone, then
 * the sequences that stress the morph: a real opener, a back-to-back pair,
 * and one that lands while the user is mid-draft.
 */

const where: Question = {
  id: 'where',
  kind: 'location',
  header: 'Where',
  prompt: 'Where should I look?',
  hint: 'A neighbourhood, a city, or "near work at…" all work.',
  required: true,
}

const budget: Question = {
  id: 'budget',
  kind: 'amount',
  header: 'Budget',
  prompt: 'What can you spend each month?',
  hint: 'You said around a grand. Correct it if that was rough.',
  per: 'month',
  prefill: { mode: 'upto', high: '1,000' },
  required: true,
}

const moveIn: Question = {
  id: 'move-in',
  kind: 'when',
  header: 'Move-in',
  prompt: 'When do you need to move in?',
  options: ['This month', 'Next month', 'In two to three months', 'Flexible'],
}

const placeType: Question = {
  id: 'place-type',
  kind: 'choice',
  header: 'Type',
  prompt: 'What kind of place?',
  hint: 'Pick one, or describe it in your own words.',
  options: [
    {
      value: 'flat',
      label: 'Whole flat',
      description: 'Your own door and kitchen',
    },
    { value: 'studio', label: 'Studio' },
    { value: 'room', label: 'Room in a shared flat' },
    { value: 'house', label: 'House' },
  ],
  required: true,
}

const mustHaves: Question = {
  id: 'must-haves',
  kind: 'choice',
  header: 'Must-haves',
  prompt: 'Anything the place has to have?',
  hint: 'Pick as many as apply, or type something else.',
  multiple: true,
  options: [
    { value: 'furnished', label: 'Furnished' },
    { value: 'pets', label: 'Pets allowed' },
    { value: 'balcony', label: 'Balcony' },
    { value: 'lift', label: 'Lift' },
    { value: 'quiet', label: 'Quiet street' },
  ],
}

const household: Question = {
  id: 'household',
  kind: 'number',
  header: 'People',
  prompt: 'How many people will live there?',
  unit: 'people',
  min: 1,
  max: 12,
  prefill: 2,
}

const anythingElse: Question = {
  id: 'anything-else',
  kind: 'text',
  header: 'Notes',
  prompt: 'Anything else that matters?',
  hint: 'Commute, a school, a gym you will not give up.',
  placeholder: 'Type or talk…',
}

const furnished: Question = {
  id: 'furnished',
  kind: 'choice',
  header: 'Furnished',
  prompt: 'Two of the best leads are unfurnished. Still worth showing?',
  options: [
    { value: 'yes', label: 'Yes, show them' },
    { value: 'no', label: 'Furnished only' },
  ],
  required: true,
}

/** What the assistant says before the questions arrive. */
export type Arrival = {
  readonly lead: string
  readonly questionnaire: Questionnaire
}

function single(question: Question, lead: string): Arrival {
  return {
    lead,
    questionnaire: { id: `single-${question.id}`, questions: [question] },
  }
}

export const kindScenarios: readonly {
  readonly label: string
  readonly arrival: Arrival
}[] = [
  { label: 'Choice', arrival: single(placeType, 'One thing first.') },
  {
    label: 'Multi choice',
    arrival: single(mustHaves, 'Before I filter anything out.'),
  },
  { label: 'Number', arrival: single(household, 'Quick one.') },
  { label: 'Amount', arrival: single(budget, 'Let me confirm the budget.') },
  { label: 'Location', arrival: single(where, 'Where should I start?') },
  { label: 'When', arrival: single(moveIn, 'And timing.') },
  { label: 'Text', arrival: single(anythingElse, 'Last thing before I search.') },
]

export const opener: Arrival = {
  lead: 'A couple of things before I search, so the first results are worth your time.',
  questionnaire: { id: 'opener', questions: [where, budget, moveIn] },
}

export const followUp: Arrival = {
  lead: 'I found six places. One check before I show them.',
  questionnaire: { id: 'follow-up', questions: [furnished] },
}

export const midDraft = 'Somewhere I can walk to the canal, and'
