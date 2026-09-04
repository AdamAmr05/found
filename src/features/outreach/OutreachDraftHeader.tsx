import {
  ArrowClockwise,
  ArrowUp,
  Check,
  Copy,
  PencilSimple,
  SpinnerGap,
} from '@phosphor-icons/react'
import { useId, useLayoutEffect, useRef } from 'react'
import type { FunctionReturnType } from 'convex/server'

import type { api } from '../../../convex/_generated/api'
import { animateSendGlyph } from './sendGlyph'
import './outreach-header.css'

type DraftState = NonNullable<
  FunctionReturnType<typeof api.outreachDrafts.get>
>['state']
export type DraftBusyState = 'copy' | 'revise' | 'send' | 'status'

export function OutreachDraftHeader({
  asking,
  busy,
  instruction,
  locked,
  sendDisabled,
  state,
  onCopy,
  onCheckStatus,
  onInstructionChange,
  onRevise,
  onSend,
  onAskingChange,
}: {
  readonly asking: boolean
  readonly busy: DraftBusyState | undefined
  readonly instruction: string
  readonly locked: boolean
  readonly sendDisabled: boolean
  readonly state: DraftState
  readonly onCopy: () => void
  readonly onCheckStatus: () => void
  readonly onInstructionChange: (value: string) => void
  readonly onRevise: () => void
  readonly onSend: () => void
  readonly onAskingChange: (asking: boolean) => void
}) {
  const instructionId = useId()
  const instructionRef = useRef<HTMLInputElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const wasAsking = useRef(asking)
  // Focus follows the disclosure, including closing after a successful revision.
  useLayoutEffect(() => {
    if (asking) instructionRef.current?.focus({ preventScroll: true })
    else if (wasAsking.current)
      toggleRef.current?.focus({ preventScroll: true })
    wasAsking.current = asking
  }, [asking])

  const checking = busy === 'status'
  const sending = busy === 'send' || state === 'queued'
  const completed = state === 'sent' || state === 'replied'
  const statusUnknown = state === 'uncertain'

  return (
    <header className="outreach-header border-b border-border-faint p-8">
      <div
        className="outreach-header-controls grid grid-cols-[minmax(0,1fr)_auto] items-center gap-8"
        data-open={asking}
      >
        <div className="outreach-edit" data-open={asking}>
          <button
            ref={toggleRef}
            aria-controls={instructionId}
            aria-expanded={asking}
            aria-label={asking ? 'Close change request' : 'Ask for changes'}
            className="outreach-edit-toggle text-accent-black focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-heat-100"
            disabled={locked}
            type="button"
            onClick={() => onAskingChange(!asking)}
          >
            <span className="grid size-40 shrink-0 place-items-center">
              <PencilSimple aria-hidden size={17} />
            </span>
            <span className="outreach-edit-label text-label-medium">Edit</span>
          </button>
          <div
            id={instructionId}
            className="outreach-edit-inputs"
            inert={!asking}
            aria-hidden={!asking}
          >
            <input
              ref={instructionRef}
              aria-label="Ask for changes"
              className="h-full min-w-0 flex-1 bg-transparent pr-4 text-body-medium outline-none placeholder:text-foreground-muted"
              disabled={locked}
              maxLength={1000}
              placeholder="Ask for changes"
              value={instruction}
              onChange={(event) => onInstructionChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  onAskingChange(false)
                } else if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault()
                  onRevise()
                }
              }}
            />
            <button
              aria-label="Apply requested changes"
              className="grid size-40 shrink-0 place-items-center rounded-8 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-heat-100 disabled:opacity-35"
              disabled={locked || !instruction.trim() || busy === 'revise'}
              type="button"
              onClick={onRevise}
            >
              <span className="grid size-30 place-items-center rounded-4 bg-accent-black text-white">
                {busy === 'revise' ? (
                  <SpinnerGap aria-hidden className="animate-spin" size={15} />
                ) : (
                  <ArrowUp aria-hidden size={15} weight="bold" />
                )}
              </span>
            </button>
          </div>
        </div>

        <div className="outreach-header-actions flex items-center gap-4">
          <button
            aria-label="Copy email body"
            className="grid size-40 place-items-center rounded-8 text-foreground-muted hover:bg-background-base hover:text-accent-black focus-visible:outline-2 focus-visible:outline-heat-100"
            title="Copy email body"
            type="button"
            onClick={onCopy}
          >
            {busy === 'copy' ? (
              <Check aria-hidden size={17} />
            ) : (
              <Copy aria-hidden size={17} />
            )}
          </button>
          <button
            className="flex h-40 items-center gap-7 rounded-8 bg-accent-black px-13 text-label-medium whitespace-nowrap text-white transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 disabled:opacity-35"
            disabled={statusUnknown ? Boolean(busy) : sendDisabled}
            type="button"
            onClick={statusUnknown ? onCheckStatus : onSend}
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse')
                animateSendGlyph(event.currentTarget)
            }}
            onFocus={(event) => {
              if (event.currentTarget.matches(':focus-visible'))
                animateSendGlyph(event.currentTarget)
            }}
          >
            {sending || checking ? (
              <SpinnerGap aria-hidden className="animate-spin" size={16} />
            ) : completed ? (
              <Check aria-hidden size={16} />
            ) : statusUnknown ? (
              <ArrowClockwise aria-hidden size={16} />
            ) : (
              <svg
                aria-hidden
                className="shrink-0"
                fill="currentColor"
                width={16}
                height={16}
                overflow="hidden"
                viewBox="0 0 256 256"
              >
                <path
                  className="outreach-send-plane"
                  d="M231.4,44.34s0,.1,0,.15l-58.2,191.94a15.88,15.88,0,0,1-14,11.51q-.69.06-1.38.06a15.86,15.86,0,0,1-14.42-9.15L107,164.15a4,4,0,0,1,.77-4.58l57.92-57.92a8,8,0,0,0-11.31-11.31L96.43,148.26a4,4,0,0,1-4.58.77L17.08,112.64a16,16,0,0,1,2.49-29.8l191.94-58.2.15,0A16,16,0,0,1,231.4,44.34Z"
                />
              </svg>
            )}
            {deliveryButtonLabel(state)}
          </button>
        </div>
      </div>
    </header>
  )
}

function deliveryButtonLabel(state: DraftState): string {
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
