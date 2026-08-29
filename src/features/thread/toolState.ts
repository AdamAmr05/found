import type { ToolUIPart } from 'ai'

import type { FoundUITools } from '../../../shared/foundTools'
import type { GoogleMapsUITools } from '../../../shared/googleMaps'

export type FoundThreadTools = FoundUITools & GoogleMapsUITools

export type FoundToolState = ToolUIPart<FoundThreadTools>['state']

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
