import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { AnswerChips } from '~/features/thread/questionnaire/AnswerChips'
import {
  chipsFromAnswers,
  formatAnswersMessage,
  type Questionnaire,
  type SubmittedAnswer,
} from '~/features/thread/questionnaire/questions'
import { ThreadComposer } from '~/features/thread/ThreadComposer'

import { revealTransition, travel } from '../motion'
import {
  followUp,
  kindScenarios,
  midDraft,
  opener,
  type Arrival,
} from './scenarios'

type Line =
  | {
      readonly id: string
      readonly kind: 'assistant'
      readonly text: string
      readonly muted: boolean
    }
  | { readonly id: string; readonly kind: 'user'; readonly text: string }
  | {
      readonly id: string
      readonly kind: 'answers'
      readonly answers: readonly SubmittedAnswer[]
    }

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

/** A line before the stage assigns its id. */
type LineInput = DistributiveOmit<Line, 'id'>

/**
 * A stage with the real ThreadComposer and a scripted assistant, so the
 * asking shape can be tuned against the true surface before the agent tool
 * exists.
 */
export function ComposerLabScene() {
  const [lines, setLines] = useState<readonly Line[]>([])
  const [pending, setPending] = useState<Questionnaire | null>(null)
  const [queue, setQueue] = useState<readonly Arrival[]>([])
  const [draft, setDraft] = useState('')
  const [received, setReceived] = useState<string | null>(null)
  const counter = useRef(0)

  function push(line: LineInput): void {
    counter.current += 1
    const id = `line-${counter.current}`
    setLines((current) => [...current, { ...line, id }])
  }

  // Each arrival is its own tool call in the app, so it gets a fresh id here
  // too; answers are kept only for a questionnaire that comes back unchanged.
  function arrive(arrival: Arrival, rest: readonly Arrival[] = []): void {
    push({ kind: 'assistant', text: arrival.lead, muted: false })
    setPending({
      ...arrival.questionnaire,
      id: `${arrival.questionnaire.id}-${counter.current}`,
    })
    setQueue(rest)
  }

  function handleAnswers(answers: readonly SubmittedAnswer[]): void {
    setReceived(formatAnswersMessage(answers))
    push({ kind: 'answers', answers })
    const [next, ...rest] = queue
    if (next) {
      arrive(next, rest)
      return
    }
    setPending(null)
    push({ kind: 'assistant', text: 'Thanks. Searching now…', muted: true })
  }

  function handleSend(promptOverride?: string): void {
    const text = (promptOverride ?? draft).trim()
    if (!text) return
    push({ kind: 'user', text })
    setReceived(text)
    setDraft('')
  }

  function reset(): void {
    setLines([])
    setPending(null)
    setQueue([])
    setDraft('')
    setReceived(null)
  }

  return (
    <div className="mx-auto w-full max-w-1180 px-16 pb-40 md:px-28">
      <header className="pt-28 pb-6 md:pt-44">
        <p className="mb-10 font-mono text-mono-x-small tracking-[0.08em] text-heat-100 uppercase">
          Interaction lab · composer
        </p>
        <h1 className="max-w-820 text-title-h3 text-balance">
          The composer asks, then gets out of the way.
        </h1>
        <p className="mt-14 max-w-620 text-body-large text-pretty text-foreground-muted">
          When Found needs two or more things before it can search, the
          composer becomes the form. The send and microphone controls never
          move, and voice lands in the field that is open.
        </p>
      </header>

      <div className="mt-24 grid gap-24 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section
          aria-label="Conversation stage"
          className="flex min-h-[640px] flex-col overflow-hidden rounded-16 bg-background-base shadow-surface-compact"
        >
          <div className="flex-1 overflow-y-auto px-20 pt-24 sm:px-32">
            <div className="mx-auto flex max-w-720 flex-col gap-16 pb-16">
              {lines.length === 0 ? (
                <p className="text-body-large text-foreground-muted">
                  Pick an arrival to see the composer change shape.
                </p>
              ) : null}
              <AnimatePresence initial={false}>
                {lines.map((line) => (
                  <Reveal key={line.id}>
                    <TranscriptLine line={line} />
                  </Reveal>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="mt-auto shrink-0 bg-gradient-to-t from-background-base via-background-base to-transparent px-20 pt-16 pb-16 sm:px-32 sm:pt-20 sm:pb-22">
            <div className="mx-auto max-w-720">
              <ThreadComposer
                disabled={false}
                questionnaire={pending}
                showIdleBeam={false}
                value={draft}
                onAnswers={handleAnswers}
                onChange={setDraft}
                onSubmit={handleSend}
              />
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-24">
          <DriverGroup hint="One per kind, judged alone." title="Arrivals">
            {kindScenarios.map((scenario) => (
              <DriverButton
                key={scenario.label}
                onClick={() => arrive(scenario.arrival)}
              >
                {scenario.label}
              </DriverButton>
            ))}
          </DriverGroup>

          <DriverGroup
            hint="The morph under load: a real opener, two in a row, and one that lands mid-sentence."
            title="Sequences"
          >
            <DriverButton onClick={() => arrive(opener)}>
              Opener, three questions
            </DriverButton>
            <DriverButton onClick={() => arrive(opener, [followUp])}>
              Back to back
            </DriverButton>
            <DriverButton
              onClick={() => {
                setDraft(midDraft)
                arrive(opener)
              }}
            >
              Arrives mid-draft
            </DriverButton>
            <DriverButton onClick={reset}>Reset</DriverButton>
          </DriverGroup>

          <DriverGroup
            hint="Prose, not JSON. It reads as something the user said."
            title="What the model receives"
          >
            <pre className="w-full whitespace-pre-wrap rounded-8 bg-black/4 p-12 font-mono text-mono-x-small text-accent-black">
              {received ?? 'Nothing sent yet.'}
            </pre>
          </DriverGroup>
        </aside>
      </div>
    </div>
  )
}

function Reveal({ children }: { readonly children: ReactNode }) {
  const reducedMotion = useReducedMotion()
  return (
    <motion.div
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      initial={{ opacity: 0, y: travel(reducedMotion, 8), filter: 'blur(4px)' }}
      transition={revealTransition}
    >
      {children}
    </motion.div>
  )
}

function TranscriptLine({ line }: { readonly line: Line }) {
  switch (line.kind) {
    case 'assistant':
      return (
        <p
          className={`max-w-620 text-body-large text-pretty ${line.muted ? 'text-foreground-muted' : 'text-accent-black'}`}
        >
          {line.text}
        </p>
      )
    case 'user':
      return (
        <p className="ml-auto max-w-560 rounded-12 bg-accent-black px-14 py-10 text-body-large text-white">
          {line.text}
        </p>
      )
    case 'answers':
      return (
        <div className="ml-auto max-w-560 rounded-12 bg-accent-black px-10 py-8">
          <AnswerChips chips={chipsFromAnswers(line.answers)} />
        </div>
      )
  }
}

function DriverGroup({
  title,
  hint,
  children,
}: {
  readonly title: string
  readonly hint: string
  readonly children: ReactNode
}) {
  return (
    <section>
      <h2 className="text-label-medium text-accent-black">{title}</h2>
      <p className="mt-2 text-body-small text-pretty text-foreground-muted">
        {hint}
      </p>
      <div className="mt-10 flex flex-wrap gap-6">{children}</div>
    </section>
  )
}

function DriverButton({
  children,
  onClick,
}: {
  readonly children: ReactNode
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      className="min-h-32 rounded-8 border-1 border-border-muted bg-background-lighter px-12 text-label-small text-accent-black transition-[scale,border-color] duration-150 ease-out hover:border-border-loud focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 active:scale-[0.96]"
      onClick={onClick}
    >
      {children}
    </button>
  )
}
