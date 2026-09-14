import type { KeyboardEvent } from 'react'

import { freeText, optionValues, toggleOption, withFreeText } from './questions'
import type { QuestionnaireController } from './useQuestionnaire'

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  )
}

/**
 * Keyboard on the pane when no text field has focus: digits pick options,
 * Enter advances, and any other character starts typing in the free-text
 * slot, so the user never has to find the field first.
 */
export function handlePaneKey(
  event: KeyboardEvent<HTMLElement>,
  controller: QuestionnaireController,
  focusField: () => void,
): void {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (isTyping(event.target)) return

  if (/^[1-9]$/u.test(event.key)) {
    const value = optionValues(controller.question)[Number(event.key) - 1]
    if (value) {
      event.preventDefault()
      controller.setAnswer(
        toggleOption(controller.question, controller.answer, value),
      )
      return
    }
  }

  if (event.target !== event.currentTarget) return
  if (event.key === 'Enter') {
    event.preventDefault()
    controller.next()
    return
  }
  if (event.key.length === 1) {
    event.preventDefault()
    controller.setAnswer(
      withFreeText(controller.answer, freeText(controller.answer) + event.key),
    )
    focusField()
  }
}
