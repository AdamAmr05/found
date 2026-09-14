import { askQuestionsInputSchema } from '../../../../shared/foundTools'
import type { FoundUIMessage } from '../ThreadMessage'
import type { Questionnaire } from './questions'

/**
 * The questions still waiting for the user: the latest message is a finished
 * assistant turn that ended with askQuestions. Any user message after it,
 * answers or otherwise, resolves them.
 */
export function pendingQuestionnaire(
  latest: FoundUIMessage | undefined,
): Questionnaire | null {
  if (!latest || latest.role !== 'assistant') return null
  for (let index = latest.parts.length - 1; index >= 0; index -= 1) {
    const part = latest.parts[index]
    if (part?.type !== 'tool-askQuestions') continue
    if (part.state !== 'output-available' && part.state !== 'input-available') {
      return null
    }
    const parsed = askQuestionsInputSchema.safeParse(part.input)
    if (!parsed.success) return null
    return { id: part.toolCallId, questions: parsed.data.questions }
  }
  return null
}
