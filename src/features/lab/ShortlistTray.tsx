import type { Candidate, CandidateId } from './candidates'
import { euros } from './candidates'
import { useCeiling } from './requirements'
import {
  ShortlistTray as SharedShortlistTray,
  type ShortlistTrayItem,
} from '../saved-candidates/ShortlistTray'

/**
 * The shortlist survives every representation, so it is present on every one of
 * them. It stays a pill until you ask for it: a permanent tray would sit on top
 * of the artifact you are reading, and the saved set is something you check
 * between decisions rather than while making one.
 */
export function ShortlistTray({
  candidates,
  savedIds,
  onRemove,
  onClear,
}: {
  readonly candidates: readonly Candidate[]
  readonly savedIds: readonly CandidateId[]
  readonly onRemove: (id: CandidateId) => void
  readonly onClear: () => void
}) {
  const ceiling = useCeiling()
  const savedIdSet = new Set(savedIds)
  const saved = candidates.filter((entry) => savedIdSet.has(entry.id))
  const savedById = new Map<string, Candidate>(
    saved.map((candidate) => [candidate.id, candidate]),
  )
  const total = saved.reduce((sum, entry) => sum + entry.allIn, 0)
  const withinCeiling = saved.filter((entry) => entry.allIn <= ceiling).length
  const items = saved.map((candidate) => toTrayItem(candidate, ceiling))

  return (
    <SharedShortlistTray
      footerNote={`${withinCeiling} of ${saved.length} within your ceiling`}
      items={items}
      summary={`${euros(total)} / month`}
      onClear={onClear}
      onRemove={(item) => {
        const candidate = savedById.get(item.id)
        if (candidate) onRemove(candidate.id)
      }}
    />
  )
}

function toTrayItem(candidate: Candidate, ceiling: number): ShortlistTrayItem {
  const over = candidate.allIn - ceiling
  return {
    id: candidate.id,
    imageUrl: candidate.imageUrl,
    priceLabel: euros(candidate.allIn),
    priceStatus: over > 0 ? `+${euros(over)}` : 'within',
    priceStatusTone: over > 0 ? 'negative' : 'neutral',
    subtitle: candidate.area,
    title: candidate.name,
  }
}
