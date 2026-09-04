import { ArrowUpRight, Check, Copy, X } from '@phosphor-icons/react'
import { useEffect, useId, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import type { LinkSafetyConfig, LinkSafetyModalProps } from 'streamdown'

export const threadLinkSafety: LinkSafetyConfig = {
  enabled: true,
  renderModal: (props) =>
    props.isOpen ? <ExternalLinkDialog {...props} /> : null,
}

function ExternalLinkDialog({ url, onClose, onConfirm }: LinkSafetyModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const [copyStatus, setCopyStatus] = useState<'ready' | 'copied' | 'failed'>(
    'ready',
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const trigger = document.activeElement
    // The native modal owns focus containment and background inertness.
    dialog.showModal()
    return () => {
      dialog.close()
      // React removes the portal before passive cleanup, so restore focus explicitly.
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(url)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  function dismissBackdrop(event: MouseEvent<HTMLDialogElement>): void {
    if (event.target !== event.currentTarget) return
    const bounds = event.currentTarget.getBoundingClientRect()
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      onClose()
  }

  // oxlint-disable-next-line anti-slop/no-runtime-typeof -- Detect browser availability for the portal; this is not external data validation.
  if (typeof document === 'undefined') return null

  return createPortal(
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- Native modal dialog: this handler dismisses only backdrop clicks; onCancel handles the keyboard Escape equivalent.
    <dialog
      ref={dialogRef}
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-440 overflow-y-auto rounded-16 border border-border-faint bg-background-lighter p-24 text-accent-black shadow-surface-artifact backdrop:bg-accent-black/20 backdrop:backdrop-blur-[2px]"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={dismissBackdrop}
    >
      <button
        aria-label="Close"
        className="absolute top-16 right-16 grid size-32 place-items-center rounded-8 text-foreground-muted transition-colors hover:bg-background-base hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
        onClick={onClose}
        type="button"
      >
        <X aria-hidden className="size-18" />
      </button>
      <h2 className="pr-32 text-label-x-large" id={titleId}>
        Open external link?
      </h2>
      <p
        className="mt-6 text-body-medium text-foreground-muted"
        id={descriptionId}
      >
        This opens in a new tab.
      </p>
      <p className="mt-20 max-h-128 overflow-y-auto rounded-8 border border-border-faint bg-background-base p-12 font-mono text-mono-x-small break-all select-text">
        {url}
      </p>
      <div className="mt-20 flex justify-end gap-10">
        <button
          className="flex min-h-40 items-center justify-center gap-8 rounded-10 border border-border-muted bg-background-lighter px-14 text-label-small transition-colors hover:bg-background-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
          onClick={() => void copyLink()}
          type="button"
        >
          {copyStatus === 'copied' ? (
            <Check aria-hidden className="size-16" />
          ) : (
            <Copy aria-hidden className="size-16" />
          )}
          {copyStatus === 'copied' ? 'Copied' : 'Copy link'}
        </button>
        <button
          className="flex min-h-40 items-center justify-center gap-8 rounded-10 bg-heat-100 px-14 text-label-small text-accent-white shadow-action-heat focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
          onClick={() => {
            onConfirm()
            onClose()
          }}
          type="button"
        >
          Open link
          <ArrowUpRight aria-hidden className="size-16" />
        </button>
      </div>
      <output
        className={
          copyStatus === 'failed'
            ? 'mt-12 block text-body-small text-accent-crimson'
            : 'sr-only'
        }
      >
        {copyStatus === 'failed'
          ? 'Couldn’t copy. You can select and copy the URL above.'
          : copyStatus === 'copied'
            ? 'Link copied.'
            : ''}
      </output>
    </dialog>,
    document.body,
  )
}
