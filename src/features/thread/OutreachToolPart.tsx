import { showOutreachDraftOutputSchema } from '../../../shared/foundTools'
import { OutreachDraft } from '../outreach/OutreachDraft'
import type { FoundUIMessage } from './ThreadMessage'

type OutreachPart = Extract<
  FoundUIMessage['parts'][number],
  { type: 'tool-showOutreachDraft' }
>

export default function OutreachToolPart({
  part,
}: {
  readonly part: OutreachPart
}) {
  if (part.state !== 'output-available') return null

  const parsed = showOutreachDraftOutputSchema.safeParse(part.output)
  if (!parsed.success) {
    return null
  }
  return <OutreachDraft draftId={parsed.data.draftId} />
}
