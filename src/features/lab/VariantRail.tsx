import { AnimatePresence, motion } from 'motion/react'
import { revealTransition, snapTransition } from './motion'
import type { VariantId } from './variantRegistry'
import { getVariant, variantRegistry } from './variantRegistry'

/** The panel the rail controls. Stable so `aria-controls` stays valid. */
export const variantPanelId = 'lab-variant-panel'

export function variantTabId(id: VariantId): string {
  return `lab-tab-${id}`
}

/**
 * Navigation between representations. The active background is one travelling
 * element, and the caption below it swaps on the same beat, so changing
 * resolution reads as one movement rather than two unrelated updates.
 */
export function VariantRail({
  activeId,
  onSelect,
}: {
  readonly activeId: VariantId
  readonly onSelect: (id: VariantId) => void
}) {
  const active = getVariant(activeId)

  return (
    <div className="sticky top-52 z-30 -mx-16 bg-background-base/88 px-16 pt-14 pb-12 backdrop-blur-[12px] md:-mx-28 md:px-28">
      <div
        aria-label="Representation"
        className="-mx-3 flex gap-3 overflow-x-auto px-3"
        role="tablist"
      >
        {variantRegistry.map((variant, index) => {
          const isActive = variant.id === activeId

          return (
            <button
              key={variant.id}
              aria-controls={variantPanelId}
              aria-selected={isActive}
              className="relative min-h-38 shrink-0 rounded-10 px-14 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
              id={variantTabId(variant.id)}
              onClick={() => onSelect(variant.id)}
              role="tab"
              tabIndex={isActive ? 0 : -1}
              type="button"
            >
              {isActive ? (
                <motion.span
                  className="absolute inset-0 rounded-10 bg-accent-black"
                  layoutId="lab-variant-active"
                  transition={snapTransition}
                />
              ) : null}
              <span className="relative z-10 flex items-baseline gap-8">
                <span
                  className={`font-mono text-mono-x-small ${
                    isActive ? 'text-white/56' : 'text-foreground-muted'
                  }`}
                >
                  {index + 1}
                </span>
                <span
                  className={`text-label-small ${
                    isActive ? 'text-white' : 'text-accent-black'
                  }`}
                >
                  {variant.name}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-10 flex min-h-20 items-baseline gap-10">
        <AnimatePresence initial={false} mode="wait">
          <motion.p
            key={active.id}
            animate={{ opacity: 1, y: 0 }}
            className="text-body-medium"
            exit={{ opacity: 0, y: -3 }}
            initial={{ opacity: 0, y: 3 }}
            transition={revealTransition}
          >
            {active.question}
            <span className="ml-8 text-body-small text-foreground-muted">
              {active.gesture}
            </span>
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  )
}
