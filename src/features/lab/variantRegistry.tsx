import type { ReactElement } from 'react'
import type { VariantProps } from './variantContract'
import { CompareMerge } from './variants/CompareMerge'
import { CostLedger } from './variants/CostLedger'
import { FoldList } from './variants/FoldList'
import { PeelCard } from './variants/PeelCard'
import { FreshnessScrub } from './variants/FreshnessScrub'
import { RankedList } from './variants/RankedList'
import { SlatWall } from './variants/SlatWall'
import { TradeoffField } from './variants/TradeoffField'
import { TriageDeck } from './variants/TriageDeck'

export type VariantId =
  | 'deck'
  | 'field'
  | 'fold'
  | 'freshness'
  | 'ledger'
  | 'merge'
  | 'peel'
  | 'ranked'
  | 'slats'

export interface VariantEntry {
  readonly id: VariantId
  readonly name: string
  /** The question this representation is better at answering than the others. */
  readonly question: string
  readonly gesture: string
  readonly render: (props: VariantProps) => ReactElement
}

/**
 * Six resolutions of one artifact. They are registered rather than routed so a
 * model could later choose a representation from the same list a person browses
 * here, without any of them owning domain state.
 */
export const variantRegistry: readonly VariantEntry[] = [
  {
    id: 'fold',
    name: 'Fold',
    question: 'Which of these is worth opening at all?',
    gesture: 'A line unfolds into the decision object without moving.',
    render: (props) => <FoldList {...props} />,
  },
  {
    id: 'peel',
    name: 'Peel',
    question: 'What is this claim actually resting on?',
    gesture: 'Drag the right edge to lift the listing off its sources.',
    render: (props) => <PeelCard {...props} />,
  },
  {
    id: 'deck',
    name: 'Deck',
    question: 'Can I get through all six quickly?',
    gesture: 'Throw right to shortlist, left to pass, up to ask the agent.',
    render: (props) => <TriageDeck {...props} />,
  },
  {
    id: 'ledger',
    name: 'Ledger',
    question: 'Who is actually inside my budget?',
    gesture: 'One shared axis. Open a row to split the cost into its parts.',
    render: (props) => <CostLedger {...props} />,
  },
  {
    id: 'slats',
    name: 'Slats',
    question: 'Can I inspect one without losing the others?',
    gesture: 'Only the width changes. Arrow keys walk the wall.',
    render: (props) => <SlatWall {...props} />,
  },
  {
    id: 'merge',
    name: 'Merge',
    question: 'Where exactly do these two disagree?',
    gesture: 'Drag two together. Divergences climb to the top.',
    render: (props) => <CompareMerge {...props} />,
  },
  {
    id: 'ranked',
    name: 'Ranked',
    question: 'What if I care about something else more?',
    gesture: 'Drag your priorities. The candidates re-rank underneath.',
    render: (props) => <RankedList {...props} />,
  },
  {
    id: 'field',
    name: 'Field',
    question: 'Which of these is simply worse than another?',
    gesture: 'Two axes and a frontier. Swap an axis to re-form the argument.',
    render: (props) => <TradeoffField {...props} />,
  },
  {
    id: 'freshness',
    name: 'Freshness',
    question: 'How much of this did I know an hour ago?',
    gesture: 'Rewind the handle. Unread sources hollow out.',
    render: (props) => <FreshnessScrub {...props} />,
  },
]

export function getVariant(id: VariantId): VariantEntry {
  const variant = variantRegistry.find((entry) => entry.id === id)

  if (!variant) {
    throw new Error(`Missing lab variant: ${id}`)
  }

  return variant
}
