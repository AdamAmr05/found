import { lazy, Suspense, useMemo, useSyncExternalStore } from 'react'

import { showMapInputSchema } from '../../../shared/googleMaps'
import { useMapSceneBridge } from './mapSceneBridge'
import type { FoundUIMessage } from './ThreadMessage'
import { ToolStep } from './ThreadToolStep'
import { isToolActive } from './toolState'

const MapScene = lazy(() => import('../accommodation/MapScene'))

type MapPart = Extract<
  FoundUIMessage['parts'][number],
  { type: 'tool-showMap' }
>

type CompletedMapPart = Extract<MapPart, { state: 'output-available' }>

export default function MapToolPart({ part }: { readonly part: MapPart }) {
  if (part.state !== 'output-available') {
    const failed =
      part.state === 'output-error' || part.state === 'output-denied'
    return (
      <ToolStep
        active={isToolActive(part.state)}
        error={failed}
        label={failed ? 'Couldn’t compose the map' : 'Composing the map scene'}
      />
    )
  }

  return <CompletedMapToolPart part={part} />
}

function CompletedMapToolPart({ part }: { readonly part: CompletedMapPart }) {
  const client = useClientReady()
  const bridge = useMapSceneBridge()
  const parsed = useMemo(
    () => showMapInputSchema.safeParse(part.input),
    [part.input],
  )

  if (!parsed.success) {
    return <ToolStep error label="Map scene could not be displayed" />
  }
  if (!client) {
    return <ToolStep active label="Composing the map scene" />
  }

  return (
    <Suspense fallback={<ToolStep active label="Composing the map scene" />}>
      <MapScene
        bridge={
          bridge && {
            selectedRef: bridge.selectedRef,
            onSelectRef: bridge.selectRef,
            onDive: bridge.onDive,
            weather: bridge.weather,
          }
        }
        scene={parsed.data}
        surfaceId={part.toolCallId}
      />
    </Suspense>
  )
}

const subscribeNever = () => () => {}

// The map module registers custom elements, so it may only load in the browser,
// and the first hydrated render must still match the server output.
function useClientReady(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
}
