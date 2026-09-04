import { lazy, Suspense, useMemo, useSyncExternalStore } from 'react'

import { showMapInputSchema } from '../../../shared/googleMaps'
import { useMapSceneBridge } from './mapSceneBridge'
import type { FoundUIMessage } from './ThreadMessage'

const MapScene = lazy(() => import('../accommodation/MapScene'))

type MapPart = Extract<
  FoundUIMessage['parts'][number],
  { type: 'tool-showMap' }
>

type CompletedMapPart = Extract<MapPart, { state: 'output-available' }>

export default function MapToolPart({ part }: { readonly part: MapPart }) {
  if (part.state !== 'output-available') return null

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
    return null
  }
  if (!client) {
    return null
  }

  return (
    <Suspense fallback={null}>
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
