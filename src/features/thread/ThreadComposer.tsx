import { ArrowUp } from '@phosphor-icons/react'
import { BorderBeam } from 'border-beam'
import { useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'

interface ThreadComposerProps {
  readonly disabled: boolean
  readonly showIdleBeam: boolean
  readonly value: string
  readonly onChange: (value: string) => void
  readonly onSubmit: () => void
}

export function ThreadComposer({
  disabled,
  showIdleBeam,
  value,
  onChange,
  onSubmit,
}: ThreadComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [interacted, setInteracted] = useState(false)
  const reducedMotion = useReducedMotion()
  const beamActive =
    showIdleBeam &&
    !interacted &&
    !disabled &&
    !value &&
    reducedMotion === false

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const currentHeight = textarea.getBoundingClientRect().height
    const transition = textarea.style.transition
    textarea.style.transition = 'none'
    textarea.style.minHeight = '0px'
    textarea.style.height = '0px'
    const nextHeight = Math.min(160, Math.max(40, textarea.scrollHeight))
    textarea.style.minHeight = ''
    textarea.style.height = `${currentHeight}px`
    void textarea.offsetHeight
    textarea.style.transition = transition

    const frame = requestAnimationFrame(() => {
      textarea.style.height = `${nextHeight}px`
    })
    return () => cancelAnimationFrame(frame)
  }, [value])

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (disabled || !value.trim()) return
    setInteracted(true)
    onSubmit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  return (
    <BorderBeam
      active={beamActive}
      borderRadius={20}
      className="thread-composer-beam"
      colorVariant="sunset"
      duration={3.8}
      size="md"
      staticColors
      strength={0.6}
      theme="light"
    >
      <form
        aria-label="Message composer"
        className="thread-composer rounded-20 bg-background-lighter p-12 shadow-surface-raised"
        onFocusCapture={() => setInteracted(true)}
        onSubmit={handleSubmit}
      >
        <label className="sr-only" htmlFor="found-message">
          Message Found
        </label>
        <textarea
          ref={textareaRef}
          id="found-message"
          className="min-h-40 w-full resize-none overflow-y-auto bg-transparent px-8 py-6 text-body-input text-accent-black transition-[height] duration-200 ease-[cubic-bezier(0.2,0,0,1)] outline-none placeholder:text-foreground-muted disabled:opacity-50 motion-reduce:transition-none"
          disabled={disabled}
          placeholder="Describe your next place…"
          rows={1}
          value={value}
          onChange={(event) => {
            setInteracted(true)
            onChange(event.target.value)
          }}
          onKeyDown={handleKeyDown}
        />
        <div className="flex justify-end">
          <button
            aria-label="Send message"
            className="grid size-36 shrink-0 place-items-center rounded-10 bg-heat-100 text-accent-white shadow-action-heat transition-[background-color,color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-heat-100 disabled:bg-border-faint disabled:text-foreground-muted disabled:shadow-none"
            disabled={disabled || value.trim().length === 0}
            type="submit"
          >
            <ArrowUp aria-hidden className="size-18" weight="regular" />
          </button>
        </div>
      </form>
    </BorderBeam>
  )
}
