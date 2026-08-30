import { showOutreachDraftOutputSchema } from '../../../shared/foundTools'
import { OutreachDraft } from '../outreach/OutreachDraft'
import type { FoundUIMessage } from './ThreadMessage'
import { ToolStep } from './ThreadToolStep'
import { isToolActive } from './toolState'

type OutreachPart = Extract<
  FoundUIMessage['parts'][number],
  { type: 'tool-showOutreachDraft' }
>

export default function OutreachToolPart({
  part,
}: {
  readonly part: OutreachPart
}) {
  if (part.state !== 'output-available') {
    const failed =
      part.state === 'output-error' || part.state === 'output-denied'
    return (
      <ToolStep
        active={isToolActive(part.state)}
        error={failed}
        label={failed ? 'Couldn’t prepare the email' : 'Writing the email'}
      />
    )
  }

  const parsed = showOutreachDraftOutputSchema.safeParse(part.output)
  if (!parsed.success) {
    return <ToolStep error label="Email draft could not be displayed" />
  }
  return <OutreachDraft draftId={parsed.data.draftId} />
}
