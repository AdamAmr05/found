import type { ToolUIPart } from 'ai'

import type { FoundUITools } from '../../../shared/foundTools'

export type FoundToolState = ToolUIPart<FoundUITools>['state']

export function isToolActive(state: FoundToolState): boolean {
  switch (state) {
    case 'input-streaming':
    case 'input-available':
    case 'approval-requested':
    case 'approval-responded':
      return true
    case 'output-available':
    case 'output-error':
    case 'output-denied':
      return false
  }
}
