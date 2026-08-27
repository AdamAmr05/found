import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import { budgetCeiling, candidates, getCandidate } from './candidates'
import type { CandidateId } from './candidates'
import { CeilingProvider } from './requirements'
import { ShortlistTray } from './ShortlistTray'
import { ThreadCaption, ThreadScene } from './thread/ThreadScene'
import { VariantRail, variantPanelId, variantTabId } from './VariantRail'
import { revealTransition, snapTransition, travel } from './motion'
import type { VariantId } from './variantRegistry'
import { getVariant, variantRegistry } from './variantRegistry'

/**
 * Two ways into the same artifact set. Representations study one object at nine
 * resolutions; the thread studies what happens to those objects once they are
 * part of a conversation. Focus, the shortlist, and the user's stated ceiling
 * are held here, above both, because none of them belong to a view.
 */
type LabMode = 'representations' | 'thread'

export function LabScene() {
  const [mode, setMode] = useState<LabMode>('representations')
  const [variantId, setVariantId] = useState<VariantId>('fold')
  const [focusedId, setFocusedId] = useState<CandidateId>('maybachufer')
  const [savedIds, setSavedIds] = useState<readonly CandidateId[]>([])
  const [ceiling, setCeiling] = useState(budgetCeiling)
  const prefersReducedMotion = useReducedMotion()

  useVariantKeys(mode === 'representations', setVariantId)

  const variant = getVariant(variantId)
  const focused = getCandidate(focusedId)

  const toggleSave = (id: CandidateId) =>
    setSavedIds((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    )

  return (
    <CeilingProvider ceiling={ceiling}>
      <div className="mx-auto w-full max-w-1180 px-16 pb-40 md:px-28">
        <LabHeader mode={mode} onModeChange={setMode} />

        {mode === 'representations' ? (
          <VariantRail activeId={variantId} onSelect={setVariantId} />
        ) : null}

        <main className="mx-auto max-w-940 pt-20 pb-96">
          {mode === 'representations' ? (
            <>
              <StatusLine focusedName={focused.name} />
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={variant.id}
                  animate={{ opacity: 1, y: 0 }}
                  aria-labelledby={variantTabId(variant.id)}
                  exit={{ opacity: 0, y: travel(prefersReducedMotion, -6) }}
                  id={variantPanelId}
                  initial={{ opacity: 0, y: travel(prefersReducedMotion, 8) }}
                  role="tabpanel"
                  transition={revealTransition}
                >
                  {variant.render({
                    candidates,
                    focusedId,
                    onFocus: setFocusedId,
                    savedIds,
                    onToggleSave: toggleSave,
                  })}
                </motion.div>
              </AnimatePresence>
            </>
          ) : (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: travel(prefersReducedMotion, 8) }}
              transition={revealTransition}
            >
              <div className="mb-16">
                <ThreadCaption />
              </div>
              <ThreadScene
                candidates={candidates}
                ceiling={ceiling}
                onCeilingChange={setCeiling}
                onToggleSave={toggleSave}
                savedIds={savedIds}
              />
            </motion.div>
          )}

          <ShortlistTray
            candidates={candidates}
            onClear={() => setSavedIds([])}
            onRemove={(id) =>
              setSavedIds((current) => current.filter((entry) => entry !== id))
            }
            savedIds={savedIds}
          />
        </main>
      </div>
    </CeilingProvider>
  )
}

function StatusLine({ focusedName }: { readonly focusedName: string }) {
  return (
    <p className="mb-14 flex flex-wrap items-baseline gap-8 text-body-small text-foreground-muted">
      <span>Currently inspecting:</span>
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={focusedName}
          animate={{ opacity: 1, y: 0 }}
          aria-live="polite"
          className="text-label-small text-accent-black"
          data-testid="lab-focused"
          exit={{ opacity: 0, y: -3 }}
          initial={{ opacity: 0, y: 3 }}
          transition={revealTransition}
        >
          {focusedName}
        </motion.span>
      </AnimatePresence>
      <span className="ml-auto font-mono text-mono-x-small">
        press 1–{variantRegistry.length} to switch representation
      </span>
    </p>
  )
}

const modes = [
  { id: 'representations', label: 'Views' },
  { id: 'thread', label: 'Conversation' },
] as const satisfies readonly { readonly id: LabMode; readonly label: string }[]

function LabHeader({
  mode,
  onModeChange,
}: {
  readonly mode: LabMode
  readonly onModeChange: (next: LabMode) => void
}) {
  return (
    <header className="pt-28 pb-6 md:pt-44">
      <p className="mb-10 font-mono text-mono-x-small tracking-[0.08em] text-heat-100 uppercase">
        Interaction lab · six places, nine views
      </p>
      <h1 className="max-w-820 text-title-h3 text-balance">
        Compare the same six places without starting over in every view.
      </h1>
      <p className="mt-14 max-w-620 text-body-large text-pretty text-foreground-muted">
        Each view answers a different question. Your focus, shortlist, and
        budget stay with you as you move between them.
      </p>

      <fieldset className="mt-18 flex gap-3 rounded-10 bg-black/4 p-3">
        <legend className="sr-only">Choose a lab view</legend>
        {modes.map((entry) => {
          const isActive = entry.id === mode

          return (
            <button
              key={entry.id}
              aria-pressed={isActive}
              className="relative min-h-34 rounded-8 px-14 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heat-100"
              onClick={() => onModeChange(entry.id)}
              type="button"
            >
              {isActive ? (
                <motion.span
                  className="absolute inset-0 rounded-8 bg-background-lighter shadow-[0_1px_3px_rgb(38_38_38/0.12)]"
                  layoutId="lab-mode"
                  transition={snapTransition}
                />
              ) : null}
              <span
                className={`relative z-10 text-label-small ${
                  isActive ? 'text-accent-black' : 'text-foreground-muted'
                }`}
              >
                {entry.label}
              </span>
            </button>
          )
        })}
      </fieldset>
    </header>
  )
}

/**
 * Number keys select a representation. Registered on the document because the
 * shortcut belongs to the page rather than to any focusable element, and
 * skipped while the user is typing or reading the thread.
 */
function useVariantKeys(
  isActive: boolean,
  onSelect: (id: VariantId) => void,
): void {
  useEffect(() => {
    if (!isActive) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target
      if (target instanceof HTMLElement && target.isContentEditable) return

      const index = Number.parseInt(event.key, 10) - 1
      const variant = variantRegistry[index]
      if (!variant) return

      event.preventDefault()
      onSelect(variant.id)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isActive, onSelect])
}
