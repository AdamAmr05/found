import {
  ArrowCounterClockwise,
  ArrowClockwise,
  ArrowUp,
  Check,
  Copy,
  PaperPlaneTilt,
  PencilSimple,
  SpinnerGap,
} from '@phosphor-icons/react'
import type { FunctionReturnType } from 'convex/server'
import type { Id } from '../../../convex/_generated/dataModel'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'

import { api } from '../../../convex/_generated/api'
import { OUTREACH_BODY_MAX_LENGTH } from '../../../shared/foundTools'
import { changedSpan } from './outreachDiff'

type Draft = NonNullable<FunctionReturnType<typeof api.outreachDrafts.get>>
type BusyState = 'copy' | 'revise' | 'send' | 'status'
type DraftFields = { recipient: string; subject: string; body: string }

function outreachDraftId(value: string): Id<'outreachDrafts'> {
  // SAFETY: Tool output is produced from the inserted Convex ID, not user input.
  return value as Id<'outreachDrafts'>
}

export function OutreachDraft({ draftId }: { readonly draftId: string }) {
  const id = outreachDraftId(draftId)
  const draft = useQuery(api.outreachDrafts.get, { draftId: id })

  if (draft === undefined) {
    return <DraftShell label="Opening the draft" />
  }
  if (draft === null) {
    return <DraftShell error label="This draft is no longer available" />
  }
  return <DraftEditor draft={draft} />
}

function DraftEditor({ draft }: { readonly draft: Draft }) {
  const [recipient, setRecipient] = useState(draft.recipient)
  const [subject, setSubject] = useState(draft.subject)
  const [body, setBody] = useState(draft.body)
  const [instruction, setInstruction] = useState('')
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState<BusyState>()
  const [error, setError] = useState<string>()
  const [statusNote, setStatusNote] = useState<string>()
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const instructionRef = useRef<HTMLInputElement>(null)
  const { saveCurrent } = useDraftPersistence({
    body,
    draft,
    recipient,
    subject,
    setBody,
    setError,
    setRecipient,
    setSubject,
  })
  const acceptProposal = useMutation(api.outreachDrafts.acceptProposal)
  const discardProposal = useMutation(api.outreachDrafts.discardProposal)
  const approveDraft = useMutation(api.outreachDrafts.approve)
  const sendDraft = useMutation(api.outreachDelivery.send)
  const recheckDelivery = useMutation(api.outreachDelivery.recheck)
  const requestRevision = useAction(api.outreachRevision.request)

  useLayoutEffect(() => {
    const textarea = bodyRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${Math.max(180, textarea.scrollHeight)}px`
  }, [body])

  function reportDraftError(cause: unknown): void {
    globalThis.reportError(cause)
    setError('That change could not be saved. Try again.')
  }

  async function revise(): Promise<void> {
    const requestedChange = instruction.trim()
    if (!requestedChange || busy) return
    setBusy('revise')
    setError(undefined)
    try {
      await saveCurrent()
      await requestRevision({
        draftId: draft._id,
        instruction: requestedChange,
      })
      setInstruction('')
      setAsking(false)
    } catch (cause) {
      reportDraftError(cause)
    } finally {
      setBusy(undefined)
    }
  }

  async function send(): Promise<void> {
    if (busy || draft.proposal) return
    setBusy('send')
    setError(undefined)
    try {
      await saveCurrent()
      await approveDraft({ draftId: draft._id })
      await sendDraft({ draftId: draft._id })
    } catch (cause) {
      globalThis.reportError(cause)
      setError('The email was not sent. Check the address and try again.')
    } finally {
      setBusy(undefined)
    }
  }

  async function checkStatus(): Promise<void> {
    if (busy || draft.state !== 'uncertain') return
    setBusy('status')
    setError(undefined)
    setStatusNote(undefined)
    try {
      const state = await recheckDelivery({ draftId: draft._id })
      if (state === 'uncertain') {
        setStatusNote('AgentMail still reports this email as pending.')
      }
    } catch (cause) {
      globalThis.reportError(cause)
      setError('The delivery status could not be checked. Try again.')
    } finally {
      setBusy(undefined)
    }
  }

  async function copyBody(): Promise<void> {
    setBusy('copy')
    try {
      await navigator.clipboard.writeText(draft.proposal?.body ?? body)
      window.setTimeout(() => setBusy(undefined), 900)
    } catch (cause) {
      reportDraftError(cause)
      setBusy(undefined)
    }
  }

  const locked = isLocked(draft.state)
  const sendDisabled = !canSend({
    body,
    busy,
    hasProposal: Boolean(draft.proposal),
    locked,
    recipient,
    subject,
  })

  return (
    <section className="relative w-full overflow-hidden rounded-16 bg-background-lighter shadow-surface-artifact">
      <DraftHeader
        asking={asking}
        busy={busy}
        instruction={instruction}
        instructionRef={instructionRef}
        sendDisabled={sendDisabled}
        state={draft.state}
        locked={locked}
        onCopy={() => void copyBody()}
        onCheckStatus={() => void checkStatus()}
        onInstructionChange={setInstruction}
        onRevise={() => void revise()}
        onSend={() => void send()}
        onToggleAsking={() => {
          setAsking((current) => !current)
          window.setTimeout(() => instructionRef.current?.focus(), 0)
        }}
      />

      <div className="relative px-16 pb-18 sm:px-20">
        <label className="flex min-h-54 items-center border-b border-border-faint">
          <span className="w-48 shrink-0 text-label-medium">To</span>
          <input
            aria-label="Recipient"
            autoComplete="email"
            className={`min-w-0 flex-1 bg-transparent text-body-large outline-none placeholder:text-foreground-muted disabled:opacity-100 ${
              draft.proposal?.recipient !== undefined &&
              draft.proposal.recipient !== recipient
                ? 'text-accent-bluetron'
                : 'disabled:text-foreground-muted'
            }`}
            disabled={locked || Boolean(draft.proposal)}
            inputMode="email"
            placeholder="Recipient email"
            value={draft.proposal?.recipient ?? recipient}
            onChange={(event) => {
              setError(undefined)
              setRecipient(event.target.value)
            }}
          />
        </label>
        <label className="flex min-h-54 items-center border-b border-border-faint">
          <span className="sr-only">Subject</span>
          <input
            className={`w-full bg-transparent text-body-large outline-none placeholder:text-foreground-muted disabled:opacity-100 ${
              draft.proposal?.subject !== undefined &&
              draft.proposal.subject !== subject
                ? 'text-accent-bluetron'
                : 'disabled:text-foreground-muted'
            }`}
            disabled={locked || Boolean(draft.proposal)}
            maxLength={200}
            placeholder="Subject"
            value={draft.proposal?.subject ?? subject}
            onChange={(event) => {
              setError(undefined)
              setSubject(event.target.value)
            }}
          />
        </label>

        {draft.proposal ? (
          <Proposal
            body={body}
            proposal={draft.proposal}
            onAccept={() => {
              void acceptProposal({ draftId: draft._id }).catch(
                reportDraftError,
              )
            }}
            onUndo={() => {
              void discardProposal({ draftId: draft._id }).catch(
                reportDraftError,
              )
            }}
          />
        ) : (
          <textarea
            ref={bodyRef}
            aria-label="Email body"
            className="mt-16 block min-h-180 w-full resize-none overflow-hidden bg-transparent text-body-large outline-none placeholder:text-foreground-muted disabled:text-foreground-muted"
            disabled={locked}
            maxLength={OUTREACH_BODY_MAX_LENGTH}
            placeholder="Write your email"
            value={body}
            onChange={(event) => {
              setError(undefined)
              setBody(event.target.value)
            }}
          />
        )}

        {error ? (
          <p className="mt-10 text-body-small text-accent-crimson" role="alert">
            {error}
          </p>
        ) : null}
        {draft.state === 'uncertain' && statusNote ? (
          <output className="mt-10 block text-body-small text-foreground-muted">
            {statusNote}
          </output>
        ) : null}
      </div>
    </section>
  )
}

function isLocked(state: Draft['state']): boolean {
  return (
    state === 'queued' ||
    state === 'sent' ||
    state === 'replied' ||
    state === 'uncertain'
  )
}

function canSend(
  args: DraftFields & {
    readonly busy: BusyState | undefined
    readonly hasProposal: boolean
    readonly locked: boolean
  },
): boolean {
  return Boolean(
    !args.locked &&
    !args.hasProposal &&
    !args.busy &&
    args.recipient.trim() &&
    args.subject.trim() &&
    args.body.trim(),
  )
}

function useDraftPersistence({
  body,
  draft,
  recipient,
  subject,
  setBody,
  setError,
  setRecipient,
  setSubject,
}: DraftFields & {
  readonly draft: Draft
  readonly setBody: Dispatch<SetStateAction<string>>
  readonly setError: Dispatch<SetStateAction<string | undefined>>
  readonly setRecipient: Dispatch<SetStateAction<string>>
  readonly setSubject: Dispatch<SetStateAction<string>>
}) {
  const updateDraft = useMutation(api.outreachDrafts.update)
  const lastObservedRevision = useRef(draft.revision)
  const lastSubmitted = useRef<DraftFields | undefined>(undefined)
  const changed =
    recipient !== draft.recipient ||
    subject !== draft.subject ||
    body !== draft.body

  useEffect(() => {
    if (lastObservedRevision.current !== draft.revision) {
      lastObservedRevision.current = draft.revision
      const submitted = lastSubmitted.current
      const serverAcknowledgedSubmission =
        submitted?.recipient === draft.recipient &&
        submitted.subject === draft.subject &&
        submitted.body === draft.body
      lastSubmitted.current = undefined
      if (
        !serverAcknowledgedSubmission &&
        (recipient !== draft.recipient ||
          subject !== draft.subject ||
          body !== draft.body)
      ) {
        // Convex is the durable external source; accepted AI proposals can
        // replace the local editor value while this component remains mounted.
        // oxlint-disable-next-line react-hooks/set-state-in-effect -- Synchronizes the editor with a newer durable Convex revision.
        setRecipient(draft.recipient)
        // oxlint-disable-next-line react-hooks/set-state-in-effect -- Synchronizes the editor with a newer durable Convex revision.
        setSubject(draft.subject)
        // oxlint-disable-next-line react-hooks/set-state-in-effect -- Synchronizes the editor with a newer durable Convex revision.
        setBody(draft.body)
        return
      }
    }
    if (!changed || draft.proposal) return
    const timer = window.setTimeout(() => {
      lastSubmitted.current = { recipient, subject, body }
      void updateDraft({
        draftId: draft._id,
        recipient,
        subject,
        body,
      }).catch((cause) => {
        globalThis.reportError(cause)
        setError('That change could not be saved. Try again.')
      })
    }, 700)
    return () => window.clearTimeout(timer)
  }, [
    body,
    changed,
    draft._id,
    draft.body,
    draft.proposal,
    draft.recipient,
    draft.revision,
    draft.subject,
    recipient,
    setBody,
    setError,
    setRecipient,
    setSubject,
    subject,
    updateDraft,
  ])

  async function saveCurrent(): Promise<void> {
    if (!changed) return
    lastSubmitted.current = { recipient, subject, body }
    await updateDraft({
      draftId: draft._id,
      recipient,
      subject,
      body,
    })
  }

  return { changed, saveCurrent }
}

function deliveryButtonLabel(state: Draft['state']): string {
  switch (state) {
    case 'queued':
      return 'Sending'
    case 'sent':
      return 'Sent'
    case 'replied':
      return 'Replied'
    case 'uncertain':
      return 'Check status'
    default:
      return 'Send'
  }
}

function DraftHeader({
  asking,
  busy,
  instruction,
  instructionRef,
  locked,
  sendDisabled,
  state,
  onCopy,
  onCheckStatus,
  onInstructionChange,
  onRevise,
  onSend,
  onToggleAsking,
}: {
  readonly asking: boolean
  readonly busy: BusyState | undefined
  readonly instruction: string
  readonly instructionRef: RefObject<HTMLInputElement | null>
  readonly locked: boolean
  readonly sendDisabled: boolean
  readonly state: Draft['state']
  readonly onCopy: () => void
  readonly onCheckStatus: () => void
  readonly onInstructionChange: (value: string) => void
  readonly onRevise: () => void
  readonly onSend: () => void
  readonly onToggleAsking: () => void
}) {
  const checking = busy === 'status'
  const sending = busy === 'send' || state === 'queued'
  const completed = state === 'sent' || state === 'replied'
  const statusUnknown = state === 'uncertain'
  const sendLabel = deliveryButtonLabel(state)
  return (
    <header className="flex min-h-58 flex-wrap items-center justify-between gap-10 border-b border-border-faint px-14 py-10 sm:px-16">
      <div
        className={`flex h-38 items-center overflow-hidden rounded-10 border transition-[width,border-color,background-color] duration-200 motion-reduce:transition-none ${
          asking
            ? 'w-full border-border-muted bg-background-base sm:w-360'
            : 'w-82 border-border-muted bg-background-lighter hover:border-border-loud'
        }`}
      >
        <button
          aria-expanded={asking}
          aria-label={asking ? 'Close change request' : 'Ask for changes'}
          className="grid size-38 shrink-0 place-items-center text-accent-black focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-heat-100"
          disabled={locked}
          type="button"
          onClick={onToggleAsking}
        >
          <PencilSimple aria-hidden size={17} />
        </button>
        {asking ? (
          <>
            <input
              ref={instructionRef}
              aria-label="Ask for changes"
              className="min-w-0 flex-1 bg-transparent pr-4 text-body-medium outline-none placeholder:text-foreground-muted"
              disabled={locked}
              maxLength={1000}
              placeholder="Ask for changes"
              value={instruction}
              onChange={(event) => onInstructionChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  onRevise()
                }
              }}
            />
            <button
              aria-label="Apply requested changes"
              className="mr-3 grid size-30 shrink-0 place-items-center rounded-8 bg-accent-black text-white disabled:opacity-35"
              disabled={locked || !instruction.trim() || busy === 'revise'}
              type="button"
              onClick={onRevise}
            >
              {busy === 'revise' ? (
                <SpinnerGap aria-hidden className="animate-spin" size={15} />
              ) : (
                <ArrowUp aria-hidden size={15} weight="bold" />
              )}
            </button>
          </>
        ) : (
          <button
            className="h-full flex-1 pr-12 text-left text-label-medium"
            disabled={locked}
            type="button"
            onClick={onToggleAsking}
          >
            Edit
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <IconButton label="Copy email body" onClick={onCopy}>
          {busy === 'copy' ? (
            <Check aria-hidden size={17} />
          ) : (
            <Copy aria-hidden size={17} />
          )}
        </IconButton>
        <button
          className="flex h-38 items-center gap-7 rounded-10 bg-accent-black px-13 text-label-medium text-white transition-opacity disabled:opacity-35"
          disabled={statusUnknown ? Boolean(busy) : sendDisabled}
          type="button"
          onClick={statusUnknown ? onCheckStatus : onSend}
        >
          {sending || checking ? (
            <SpinnerGap aria-hidden className="animate-spin" size={16} />
          ) : completed ? (
            <Check aria-hidden size={16} />
          ) : statusUnknown ? (
            <ArrowClockwise aria-hidden size={16} />
          ) : (
            <PaperPlaneTilt aria-hidden size={16} />
          )}
          {sendLabel}
        </button>
      </div>
    </header>
  )
}

function Proposal({
  body,
  proposal,
  onAccept,
  onUndo,
}: {
  readonly body: string
  readonly proposal: NonNullable<Draft['proposal']>
  readonly onAccept: () => void
  readonly onUndo: () => void
}) {
  return (
    <div className="relative min-h-220 pt-50">
      <div className="absolute top-12 left-1/2 z-10 flex -translate-x-1/2 rounded-10 border border-border-muted bg-accent-black p-3 text-white shadow-surface-compact">
        <button
          className="flex h-32 items-center gap-6 rounded-8 px-10 text-label-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white"
          type="button"
          onClick={onUndo}
        >
          <ArrowCounterClockwise aria-hidden size={15} />
          Undo
        </button>
        <button
          className="flex h-32 items-center gap-6 rounded-8 bg-accent-bluetron px-10 text-label-medium focus-visible:outline-2 focus-visible:outline-white"
          type="button"
          onClick={onAccept}
        >
          <Check aria-hidden size={15} />
          Accept
        </button>
      </div>
      <p className="text-body-large whitespace-pre-wrap">
        <ChangedText next={proposal.body} previous={body} />
      </p>
    </div>
  )
}

function ChangedText({
  next,
  previous,
}: {
  readonly next: string
  readonly previous: string
}) {
  const span = changedSpan(previous, next)
  return (
    <>
      {span.before}
      {span.changed ? (
        <mark className="bg-transparent text-accent-bluetron">
          {span.changed}
        </mark>
      ) : null}
      {span.after}
    </>
  )
}

function IconButton({
  children,
  label,
  onClick,
}: {
  readonly children: React.ReactNode
  readonly label: string
  readonly onClick: () => void
}) {
  return (
    <button
      aria-label={label}
      className="grid size-38 place-items-center rounded-10 text-foreground-muted hover:bg-background-base hover:text-accent-black focus-visible:outline-2 focus-visible:outline-heat-100"
      title={label}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function DraftShell({
  error = false,
  label,
}: {
  readonly error?: boolean
  readonly label: string
}) {
  return (
    <div
      className={`rounded-16 border px-16 py-18 text-body-medium ${
        error
          ? 'border-accent-crimson/20 text-accent-crimson'
          : 'border-border-muted bg-background-lighter text-foreground-muted'
      }`}
    >
      {label}
    </div>
  )
}
