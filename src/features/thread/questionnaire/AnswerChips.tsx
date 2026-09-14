import { motion, useReducedMotion } from 'motion/react'

import type { AnswerChip } from './questions'

const REVEAL = { duration: 0.24, ease: [0.22, 1, 0.36, 1] } as const

/**
 * How the answers read back in the transcript: the user's dark bubble, but
 * chips rather than prose, so it scans as decisions instead of a paragraph.
 */
export function AnswerChips({
  chips,
}: {
  readonly chips: readonly AnswerChip[]
}) {
  const reducedMotion = useReducedMotion()
  const lift = reducedMotion === true ? 0 : 6
  const item = {
    hidden: { opacity: 0, y: lift, filter: 'blur(4px)' },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)' },
  }

  return (
    <motion.ul
      animate="visible"
      className="flex flex-wrap gap-6"
      initial="hidden"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
    >
      {chips.map(({ id, header, text }) => (
        <motion.li
          key={id}
          className="inline-flex min-h-26 items-center gap-6 rounded-full bg-white/12 px-10 text-label-small text-white"
          transition={REVEAL}
          variants={item}
        >
          <span className="text-white/60">{header}</span>
          <span className={text === null ? 'text-white/60' : ''}>
            {text ?? 'skipped'}
          </span>
        </motion.li>
      ))}
    </motion.ul>
  )
}
