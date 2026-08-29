import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { LookupWeatherOutput } from '../../../shared/googleMaps'

export type MapSceneDiveListener = (candidateRef: string) => void

export type MapSceneBridgeValue = {
  readonly mappedRefs: ReadonlySet<string>
  readonly weather: LookupWeatherOutput | undefined
  readonly selectedRef: string | undefined
  readonly selectRef: (ref: string | undefined) => void
  readonly requestDive: (ref: string) => void
  readonly onDive: (listener: MapSceneDiveListener) => () => void
}

const MapSceneBridgeContext = createContext<MapSceneBridgeValue | undefined>(
  undefined,
)

export function MapSceneBridgeProvider({
  children,
  mappedRefs,
  weather,
}: {
  readonly children: ReactNode
  readonly mappedRefs: ReadonlySet<string>
  readonly weather: LookupWeatherOutput | undefined
}) {
  const [selectedRef, setSelectedRef] = useState<string>()
  const diveListenersRef = useRef(new Set<MapSceneDiveListener>())

  const requestDive = useCallback((ref: string) => {
    setSelectedRef(ref)
    for (const listener of diveListenersRef.current) listener(ref)
  }, [])

  const onDive = useCallback((listener: MapSceneDiveListener) => {
    diveListenersRef.current.add(listener)
    return () => {
      diveListenersRef.current.delete(listener)
    }
  }, [])

  const value = useMemo<MapSceneBridgeValue>(
    () => ({
      mappedRefs,
      weather,
      selectedRef,
      selectRef: setSelectedRef,
      requestDive,
      onDive,
    }),
    [mappedRefs, onDive, requestDive, selectedRef, weather],
  )

  return (
    <MapSceneBridgeContext.Provider value={value}>
      {children}
    </MapSceneBridgeContext.Provider>
  )
}

export function useMapSceneBridge(): MapSceneBridgeValue | undefined {
  return useContext(MapSceneBridgeContext)
}
