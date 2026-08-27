import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import type { Candidate, CandidateId, Claim } from '../candidates'
import { AskIcon, CheckIcon, CloseIcon, UndoIcon } from '../icons'
import {
  releaseTransition,
  revealTransition,
  settleTransition,
  travel,
} from '../motion'
import { Meta, StatusDot } from '../primitives'

interface LooseEnd {
  readonly id: string
  readonly candidateId: CandidateId
  readonly candidateName: string
  readonly claim: Claim
  readonly question: string
}

type SendState = 'drafting' | 'approved' | 'sending' | 'sent'

const sendLabel = {
  drafting: 'Approve this exact message',
  approved: 'Send it',
  sending: 'Sending',
  sent: 'Sent',
} satisfies Record<SendState, string>

/**
 * Loose ends. The unresolved claims are the actual work left, so they are
 * objects you can pick up rather than red text you have to remember. Gathering
 * them composes the message, and the approval binds to the wording that is on
 * screen: editing the set puts the approval back, because an approval that
 * survives an edit is not an approval of anything.
 */
export function LooseEnds({
  candidates,
}: {
  readonly candidates: readonly Candidate[]
}) {
  const [gathered, setGathered] = useState<readonly string[]>([])
  const [sendState, setSendState] = useState<SendState>('drafting')
  const prefersReducedMotion = useReducedMotion()

  const ends = looseEndsIn(candidates)
  const loose = ends.filter((end) => !gathered.includes(end.id))
  const picked = gathered.flatMap((id) => {
    const end = ends.find((entry) => entry.id === id)
    return end ? [end] : []
  })

  /* Any change to the message invalidates whatever was approved before it. */
  const gather = (id: string) => {
    setGathered((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    )
    setSendState('drafting')
  }

  const advance = () => {
    if (sendState === 'drafting') return setSendState('approved')
    if (sendState === 'approved') return setSendState('sending')
    if (sendState === 'sending') return setSendState('sent')
  }

  return (
    <section
      aria-label="Open questions and the message that would ask them"
      className="rounded-16 bg-background-lighter p-14 shadow-[0_0_0_1px_rgb(38_38_38/0.08)]"
    >
      <header className="mb-10 flex items-baseline gap-10">
        <p className="text-label-small">Still unanswered</p>
        <Meta>{loose.length} left · tap one to put it in the message</Meta>
      </header>

      <ul className="flex min-h-46 flex-wrap gap-6">
        <AnimatePresence initial={false} mode="popLayout">
          {loose.map((end) => (
            <motion.li
              key={end.id}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              layout
              transition={releaseTransition}
            >
              <motion.button
                className="flex min-h-38 items-center gap-8 rounded-8 bg-black/4 px-10 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
                onClick={() => gather(end.id)}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                <StatusDot className="size-6" status={end.claim.status} />
                <span className="text-label-x-small">
                  {end.claim.requirement}
                </span>
                <span className="text-label-x-small text-foreground-muted">
                  {end.candidateName}
                </span>
              </motion.button>
            </motion.li>
          ))}
        </AnimatePresence>

        {loose.length === 0 ? (
          <li className="flex min-h-38 items-center text-body-small text-foreground-muted">
            Every open question is in the message.
          </li>
        ) : null}
      </ul>

      <motion.div
        className="mt-12 rounded-12 bg-black/3 p-12"
        layout
        transition={settleTransition}
      >
        <div className="flex items-center gap-8">
          <AskIcon className="size-15 text-heat-100" />
          <p className="text-label-x-small">Draft to the operators</p>
          <Meta>Nothing is sent without your approval.</Meta>
        </div>

        <motion.div className="mt-10 text-body-medium" layout>
          <p>Hello — a few things I could not confirm from your listing:</p>
          <ul className="mt-8 flex flex-col gap-2">
            <AnimatePresence initial={false} mode="popLayout">
              {picked.map((end) => (
                <motion.li
                  key={end.id}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-baseline gap-8 rounded-8 bg-background-lighter px-10 py-7"
                  exit={{ opacity: 0, x: travel(prefersReducedMotion, -10) }}
                  initial={{ opacity: 0, x: travel(prefersReducedMotion, -10) }}
                  layout
                  transition={revealTransition}
                >
                  <span className="text-body-small text-foreground-muted">
                    —
                  </span>
                  <span className="min-w-0 flex-1 text-body-small">
                    {end.question}
                  </span>
                  <button
                    aria-label={`Take “${end.claim.requirement}” back out of the message`}
                    className="grid size-24 shrink-0 place-items-center rounded-6 text-foreground-muted hover:bg-black/6 hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-heat-100"
                    onClick={() => gather(end.id)}
                    type="button"
                  >
                    <CloseIcon className="size-12" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          {picked.length === 0 ? (
            <p className="mt-8 rounded-8 border-1 border-dashed border-border-loud px-10 py-10 text-body-small text-foreground-muted">
              Nothing gathered yet. The message is empty, so there is nothing to
              approve.
            </p>
          ) : null}
        </motion.div>

        <div className="mt-12 flex items-center gap-10">
          <motion.button
            className={`flex min-h-38 items-center gap-8 rounded-10 px-14 text-label-small ${
              sendState === 'sent'
                ? 'bg-accent-forest text-white'
                : 'bg-heat-100 text-white shadow-[0_2px_6px_rgb(250_93_25/0.24)]'
            } focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 disabled:bg-black/8 disabled:text-foreground-muted disabled:shadow-none`}
            disabled={picked.length === 0 || sendState === 'sent'}
            layout
            onClick={advance}
            transition={settleTransition}
            type="button"
            whileTap={{ scale: picked.length === 0 ? 1 : 0.97 }}
          >
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={sendState}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-8"
                exit={{ opacity: 0, y: -6 }}
                initial={{ opacity: 0, y: 6 }}
                transition={revealTransition}
              >
                {sendState === 'sent' ? (
                  <CheckIcon className="size-14" />
                ) : null}
                {sendLabel[sendState]}
              </motion.span>
            </AnimatePresence>
          </motion.button>

          {sendState === 'approved' || sendState === 'sending' ? (
            <motion.button
              animate={{ opacity: 1 }}
              className="flex min-h-38 items-center gap-6 rounded-10 px-10 text-label-x-small text-foreground-muted hover:bg-black/4 hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
              initial={{ opacity: 0 }}
              onClick={() => setSendState('drafting')}
              transition={revealTransition}
              type="button"
            >
              <UndoIcon className="size-13" />
              Withdraw approval
            </motion.button>
          ) : null}

          <Meta>
            {sendState === 'drafting'
              ? `${picked.length} question${picked.length === 1 ? '' : 's'} ready for approval`
              : `${picked.length} approved question${picked.length === 1 ? '' : 's'}`}
          </Meta>
        </div>
      </motion.div>
    </section>
  )
}

/** Anything the sources did not settle is a question someone still has to ask. */
function looseEndsIn(candidates: readonly Candidate[]): readonly LooseEnd[] {
  return candidates.flatMap((candidate) =>
    candidate.claims
      .filter((claim) => claim.status !== 'confirmed')
      .map((claim) => ({
        id: `${candidate.id}-${claim.requirement}`,
        candidateId: candidate.id,
        candidateName: candidate.name,
        claim,
        question: questionFor(candidate, claim),
      })),
  )
}

function questionFor(candidate: Candidate, claim: Claim): string {
  const subject = `${claim.requirement.toLowerCase()} at ${candidate.name}`

  if (claim.status === 'contradicted') {
    return `Two of your pages disagree about the ${subject}. Which is current?`
  }
  if (claim.status === 'unknown') {
    return `I could not find anything about the ${subject}. Can you confirm it?`
  }
  return `Your listing states “${claim.claimed}” for the ${subject}. Can you confirm that in writing?`
}
