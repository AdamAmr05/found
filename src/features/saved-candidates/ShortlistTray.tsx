import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Transition } from 'motion/react'
import type { RefObject, SVGProps } from 'react'
import { useRef, useState } from 'react'
import { CandidateThumbnail } from './CandidateThumbnail'

const snapTransition: Transition = {
  type: 'spring',
  stiffness: 520,
  damping: 42,
  mass: 0.7,
}

const settleTransition: Transition = {
  type: 'spring',
  stiffness: 340,
  damping: 36,
}

const revealTransition: Transition = {
  duration: 0.24,
  ease: [0.22, 1, 0.36, 1],
}

function travel(prefersReducedMotion: boolean | null, distance: number) {
  return prefersReducedMotion === true ? 0 : distance
}

export interface ShortlistTrayItem {
  readonly id: string
  readonly imageUrl?: string | undefined
  readonly priceLabel?: string
  readonly priceStatus?: string
  readonly priceStatusTone?: 'neutral' | 'negative'
  readonly subtitle: string
  readonly title: string
}

interface ShortlistTrayProps {
  readonly footerNote?: string | undefined
  readonly hasMore?: boolean | undefined
  readonly items: readonly ShortlistTrayItem[]
  readonly loadingMore?: boolean | undefined
  readonly onClear?: (() => void) | undefined
  readonly onLoadMore?: (() => void) | undefined
  readonly onRemove: (item: ShortlistTrayItem) => void
  readonly summary?: string | undefined
}

/**
 * One shortlist surface shared by the product and the interaction lab. The
 * collapsed pill and expanded tray are the same object at two real sizes.
 */
export function ShortlistTray({
  footerNote,
  hasMore = false,
  items,
  loadingMore = false,
  onClear,
  onLoadMore,
  onRemove,
  summary,
}: ShortlistTrayProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [collapsedWidth, setCollapsedWidth] = useState<number | null>(null)
  const headerContentRef = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const toggleOpen = () => {
    if (isOpen) {
      const content = headerContentRef.current
      if (content) {
        const horizontalPadding = 22
        setCollapsedWidth(
          content.getBoundingClientRect().width + horizontalPadding,
        )
      }
    }

    setIsOpen((current) => !current)
  }

  return (
    <aside
      aria-label="Shortlist"
      className="pointer-events-none sticky bottom-20 z-40 flex justify-center"
    >
      <motion.div
        animate={{
          borderRadius: isOpen ? 16 : 24,
          width: isOpen ? 380 : (collapsedWidth ?? 'auto'),
        }}
        className="pointer-events-auto overflow-hidden bg-background-lighter shadow-[0_0_0_1px_rgb(38_38_38/0.1),0_12px_32px_rgb(38_38_38/0.12)]"
        data-testid="shortlist-surface"
        initial={false}
        transition={settleTransition}
      >
        <TrayHeader
          contentRef={headerContentRef}
          hasMore={hasMore}
          isOpen={isOpen}
          items={items}
          onToggle={toggleOpen}
          summary={summary}
        />

        <AnimatePresence
          initial={false}
          onExitComplete={() => setCollapsedWidth(null)}
        >
          {isOpen && items.length > 0 ? (
            <TrayBody
              footerNote={footerNote}
              hasMore={hasMore}
              items={items}
              loadingMore={loadingMore}
              onClear={onClear}
              onLoadMore={onLoadMore}
              onRemove={onRemove}
              prefersReducedMotion={prefersReducedMotion}
            />
          ) : null}
        </AnimatePresence>
      </motion.div>
    </aside>
  )
}

function TrayHeader({
  contentRef,
  hasMore,
  isOpen,
  items,
  onToggle,
  summary,
}: {
  readonly contentRef: RefObject<HTMLSpanElement | null>
  readonly hasMore: boolean
  readonly isOpen: boolean
  readonly items: readonly ShortlistTrayItem[]
  readonly onToggle: () => void
  readonly summary?: string | undefined
}) {
  const visibleCount = `${items.length}${hasMore ? '+' : ''}`

  return (
    <motion.button
      aria-expanded={isOpen}
      className="flex min-h-48 w-full items-center pr-14 pl-8 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-heat-100"
      disabled={items.length === 0}
      onClick={onToggle}
      type="button"
    >
      <span
        ref={contentRef}
        className="flex w-max shrink-0 items-center gap-12"
      >
        <ThumbnailStack hasMore={hasMore} items={items} />
        <span className="flex items-baseline gap-8">
          <span className="text-label-small whitespace-nowrap tabular-nums">
            {items.length === 0
              ? 'Nothing shortlisted yet'
              : `${visibleCount} shortlisted`}
          </span>
          {items.length > 0 && summary ? (
            <span className="font-mono text-mono-x-small text-foreground-muted tabular-nums">
              {summary}
            </span>
          ) : null}
        </span>
        {items.length > 0 ? (
          <motion.span
            animate={{ rotate: isOpen ? -90 : 90 }}
            className="ml-4 text-foreground-muted"
            transition={snapTransition}
          >
            <ChevronIcon className="size-15" />
          </motion.span>
        ) : null}
      </span>
    </motion.button>
  )
}

function TrayBody({
  footerNote,
  hasMore,
  items,
  loadingMore,
  onClear,
  onLoadMore,
  onRemove,
  prefersReducedMotion,
}: Omit<ShortlistTrayProps, 'summary'> & {
  readonly prefersReducedMotion: boolean | null
}) {
  const showFooter = Boolean(footerNote || onClear || (hasMore && onLoadMore))

  return (
    <motion.div
      key="tray"
      animate={{ height: 'auto' }}
      className="overflow-hidden"
      data-testid="shortlist-body"
      exit={{ height: 0 }}
      initial={{ height: 0 }}
      style={{ transformOrigin: 'top' }}
      transition={settleTransition}
    >
      <div className="w-380 border-t-1 border-border-faint p-8">
        <ul
          className={`flex flex-col gap-2${
            hasMore || items.length > 5
              ? 'max-h-280 overflow-y-auto overscroll-contain'
              : ''
          }`}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((item) => (
              <motion.li
                key={item.id}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: travel(prefersReducedMotion, 12),
                }}
                initial={{
                  opacity: 0,
                  x: travel(prefersReducedMotion, -12),
                }}
                layout
                transition={revealTransition}
              >
                <SavedRow item={item} onRemove={() => onRemove(item)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        {showFooter ? (
          <TrayFooter
            footerNote={footerNote}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onClear={onClear}
            onLoadMore={onLoadMore}
          />
        ) : null}
      </div>
    </motion.div>
  )
}

function TrayFooter({
  footerNote,
  hasMore,
  loadingMore,
  onClear,
  onLoadMore,
}: Pick<
  ShortlistTrayProps,
  'footerNote' | 'hasMore' | 'loadingMore' | 'onClear' | 'onLoadMore'
>) {
  return (
    <div className="mt-8 flex items-center justify-between gap-8 border-t-1 border-border-faint px-10 pt-10">
      <p className="text-label-x-small text-foreground-muted">{footerNote}</p>
      <div className="flex items-center gap-4">
        {hasMore && onLoadMore ? (
          <motion.button
            className="min-h-30 rounded-8 px-10 text-label-x-small text-accent-black hover:bg-black/4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100 disabled:opacity-50"
            disabled={loadingMore}
            onClick={onLoadMore}
            type="button"
            whileTap={{ scale: 0.97 }}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </motion.button>
        ) : null}
        {onClear ? (
          <motion.button
            className="min-h-30 rounded-8 px-10 text-label-x-small text-foreground-muted hover:bg-black/4 hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
            onClick={onClear}
            type="button"
            whileTap={{ scale: 0.97 }}
          >
            Clear all
          </motion.button>
        ) : null}
      </div>
    </div>
  )
}

function ThumbnailStack({
  hasMore,
  items,
}: {
  readonly hasMore: boolean
  readonly items: readonly ShortlistTrayItem[]
}) {
  if (items.length === 0) {
    return (
      <span
        aria-hidden="true"
        className="size-32 shrink-0 rounded-full border-1 border-dashed border-border-loud"
      />
    )
  }

  return (
    <span aria-hidden="true" className="flex shrink-0 items-center">
      <AnimatePresence initial={false} mode="popLayout">
        {items.slice(0, 4).map((item, index) => (
          <motion.span
            key={item.id}
            animate={{ opacity: 1, scale: 1 }}
            className="size-32 overflow-hidden rounded-full bg-black/8 ring-2 ring-background-lighter"
            exit={{ opacity: 0, scale: 0.6 }}
            initial={{ opacity: 0, scale: 0.6 }}
            layout
            style={{ marginLeft: index === 0 ? 0 : -10, zIndex: 4 - index }}
            transition={snapTransition}
          >
            <CandidateThumbnail imageUrl={item.imageUrl} />
          </motion.span>
        ))}
      </AnimatePresence>
      {items.length > 4 || hasMore ? (
        <span className="-ml-10 grid size-32 place-items-center rounded-full bg-accent-black font-mono text-mono-x-small text-white tabular-nums ring-2 ring-background-lighter">
          {hasMore ? '+' : items.length - 4}
        </span>
      ) : null}
    </span>
  )
}

function SavedRow({
  item,
  onRemove,
}: {
  readonly item: ShortlistTrayItem
  readonly onRemove: () => void
}) {
  return (
    <div className="flex min-h-52 items-center gap-10 rounded-10 px-10 hover:bg-black/3">
      <span className="size-36 shrink-0 overflow-hidden rounded-8 bg-black/8">
        <CandidateThumbnail imageUrl={item.imageUrl} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label-small">{item.title}</span>
        <span className="block truncate text-label-x-small text-foreground-muted">
          {item.subtitle}
        </span>
      </span>
      {item.priceLabel ? (
        <span className="shrink-0 text-right">
          <span className="block font-mono text-mono-small tabular-nums">
            {item.priceLabel}
          </span>
          {item.priceStatus ? (
            <span
              className={`block text-label-x-small ${
                item.priceStatusTone === 'negative'
                  ? 'text-accent-crimson'
                  : 'text-foreground-muted'
              }`}
            >
              {item.priceStatus}
            </span>
          ) : null}
        </span>
      ) : null}
      <button
        aria-label={`Remove ${item.title} from the shortlist`}
        className="relative grid size-28 shrink-0 place-items-center rounded-6 text-foreground-muted after:absolute after:top-1/2 after:left-1/2 after:size-40 after:-translate-x-1/2 after:-translate-y-1/2 hover:bg-black/6 hover:text-accent-black focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-heat-100"
        onClick={onRemove}
        type="button"
      >
        <CloseIcon className="size-14" />
      </button>
    </div>
  )
}

type IconProps = SVGProps<SVGSVGElement>

function ChevronIcon(props: IconProps) {
  return (
    <svg
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

function CloseIcon(props: IconProps) {
  return (
    <svg
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
