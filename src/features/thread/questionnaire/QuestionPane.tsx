import { CaretLeft } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import type { KeyboardEvent, Ref } from 'react'

import { QuietButton, type FieldRecording } from './fieldPrimitives'
import { QuestionField } from './QuestionField'
import type { QuestionnaireController } from './useQuestionnaire'

const HIDDEN = { opacity: 0, filter: 'blur(4px)' } as const
const VISIBLE = { opacity: 1, filter: 'blur(0px)' } as const
const ENTER = { duration: 0.22, ease: [0.2, 0, 0, 1] } as const
/** Exits are softer and shorter than enters; attention is already moving on. */
const EXIT = { duration: 0.12, ease: 'easeIn' } as const
const INSTANT = { duration: 0 } as const

function travel(reducedMotion: boolean | null, distance: number): number {
  return reducedMotion === true ? 0 : distance
}

/** Where the user is, as shadcn shows it: a line of text, not a row of chips. */
function Progress({ controller }: { readonly controller: QuestionnaireController }) {
  return (
    <p className="font-mono text-mono-x-small text-foreground-muted tabular-nums">
      {controller.index + 1} of {controller.count}
    </p>
  )
}

type QuestionBodyProps = {
  readonly controller: QuestionnaireController
  readonly recording: FieldRecording | null
  readonly entryRef: Ref<HTMLInputElement>
  readonly areaRef: Ref<HTMLTextAreaElement>
  readonly reducedMotion: boolean | null
}

/**
 * One question: title, description, its field, and any validation message,
 * on shadcn's rhythm. Takes a ref so AnimatePresence can pop the leaving
 * body out of flow; otherwise old and new stack for a frame and the surface
 * height spikes.
 */
function QuestionBody({
  ref,
  controller,
  recording,
  entryRef,
  areaRef,
  reducedMotion,
}: QuestionBodyProps & { readonly ref?: Ref<HTMLDivElement> | undefined }) {
  const instant = reducedMotion === true
  const { question } = controller
  return (
    <motion.div
      ref={ref}
      animate={{ ...VISIBLE, y: 0 }}
      className="flex min-w-0 flex-col gap-16"
      exit={{
        ...HIDDEN,
        y: travel(reducedMotion, -6),
        transition: instant ? INSTANT : EXIT,
      }}
      initial={{ ...HIDDEN, y: travel(reducedMotion, 6) }}
      transition={instant ? INSTANT : ENTER}
    >
      <div className="flex flex-col gap-4">
        <h2 className="text-label-large text-pretty text-accent-black">
          {question.prompt}
        </h2>
        {question.hint ? (
          <p className="text-body-medium text-pretty text-foreground-muted">
            {question.hint}
          </p>
        ) : null}
      </div>
      <QuestionField
        answer={controller.answer}
        areaRef={areaRef}
        entryRef={entryRef}
        question={question}
        recording={recording}
        onChange={controller.setAnswer}
        onEnter={controller.next}
      />
      <AnimatePresence initial={false}>
        {controller.error ? (
          <motion.p
            animate={{ opacity: 1, height: 'auto' }}
            className="-mt-8 overflow-hidden text-body-medium text-accent-crimson"
            exit={{ opacity: 0, height: 0 }}
            initial={{ opacity: 0, height: 0 }}
            role="alert"
            transition={instant ? INSTANT : ENTER}
          >
            {controller.error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

type QuestionPaneProps = QuestionBodyProps & {
  readonly paneRef: Ref<HTMLFieldSetElement>
  readonly onKeyDown: (event: KeyboardEvent<HTMLFieldSetElement>) => void
}

/**
 * The composer in its asking shape. Progress stays put; only the question in
 * the middle changes, so moving between questions reads as the same object
 * changing rather than a new panel each time.
 */
export function QuestionPane({
  controller,
  paneRef,
  recording,
  entryRef,
  areaRef,
  reducedMotion,
  onKeyDown,
}: QuestionPaneProps) {
  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- the pane is the roving focus target of a composite widget: digits pick options and any character starts typing.
    <fieldset
      ref={paneRef}
      className="flex min-w-0 flex-col gap-8 px-4 pt-4 outline-none"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <legend className="sr-only">
        Question {controller.index + 1} of {controller.count}
      </legend>
      {controller.count > 1 ? <Progress controller={controller} /> : null}
      <AnimatePresence initial={false} mode="popLayout">
        <QuestionBody
          key={controller.question.id}
          areaRef={areaRef}
          controller={controller}
          entryRef={entryRef}
          recording={recording}
          reducedMotion={reducedMotion}
        />
      </AnimatePresence>
    </fieldset>
  )
}

/** Back and Skip. Text actions beside the send and microphone controls. */
export function QuestionFooter({
  controller,
}: {
  readonly controller: QuestionnaireController
}) {
  return (
    <div className="flex min-h-36 items-center">
      {controller.index > 0 ? (
        <QuietButton onClick={controller.previous}>
          <CaretLeft aria-hidden className="size-12" weight="bold" />
          Back
        </QuietButton>
      ) : null}
      {controller.question.required ? null : (
        <QuietButton onClick={controller.skip}>Skip</QuietButton>
      )}
    </div>
  )
}
