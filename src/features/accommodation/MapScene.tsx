import { A2UIRenderer } from '@googlemaps/a2ui/lit'
import { ArrowsOut } from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import type {
  LookupWeatherOutput,
  ShowMapInput,
} from '../../../shared/googleMaps'
import { ImmersiveMapOverlay } from './ImmersiveMapOverlay'
import { Map3DView } from './Map3DView'
import {
  sceneModelFromShowMap,
  scenePinForCandidate,
  type MapPin3D,
} from './map3dScene'
import { buildPlaceCardsMessages } from './mapSceneSurface'
import { weatherGlance } from './mapWeather'
import { useMapsRuntimeState } from './mapsRuntime'

export type MapSceneBridgeProps = {
  readonly selectedRef?: string | undefined
  readonly onSelectRef?: ((ref: string | undefined) => void) | undefined
  readonly onDive?:
    ((listener: (candidateRef: string) => void) => () => void) | undefined
  readonly weather?: LookupWeatherOutput | undefined
}

export default function MapScene({
  bridge,
  scene,
  surfaceId,
}: {
  readonly bridge?: MapSceneBridgeProps | undefined
  readonly scene: ShowMapInput
  readonly surfaceId: string
}) {
  const runtime = useMapsRuntimeState()
  const model = useMemo(() => sceneModelFromShowMap(scene), [scene])
  const [overlay, setOverlay] = useState<{ divePinId?: string } | null>(null)
  const bridgeRef = useRef(bridge)
  useEffect(() => {
    bridgeRef.current = bridge
  })

  const onDive = bridge?.onDive
  useEffect(() => {
    if (!onDive) return
    return onDive((candidateRef) => {
      const pin = scenePinForCandidate(model, candidateRef)
      if (pin) setOverlay({ divePinId: pin.id })
    })
  }, [model, onDive])

  if (runtime === 'failed') {
    return (
      <p className="text-body-medium text-foreground-muted">
        The map for “{scene.title}” couldn’t load right now.
      </p>
    )
  }

  function handlePinClick(pin: MapPin3D): void {
    if (pin.candidateRef) bridgeRef.current?.onSelectRef?.(pin.candidateRef)
    setOverlay({ divePinId: pin.id })
  }

  function handlePinFocus(pin: MapPin3D): void {
    if (pin.candidateRef) bridgeRef.current?.onSelectRef?.(pin.candidateRef)
  }

  return (
    <figure className="flex flex-col gap-8">
      <figcaption className="flex items-center justify-between gap-12">
        <span className="min-w-0 truncate text-label-medium text-accent-black">
          {scene.title}
        </span>
        <span className="ml-auto">
          <InlineWeatherGlance weather={bridge?.weather} />
        </span>
        <button
          aria-label="Expand the map"
          className="grid size-28 place-items-center rounded-8 text-foreground-muted transition-colors duration-4 hover:bg-background-lighter hover:text-accent-black"
          onClick={() => setOverlay({})}
          type="button"
        >
          <ExpandIcon />
        </button>
      </figcaption>
      {runtime === 'ready' ? (
        <Map3DView
          camera={model.overview}
          className="aspect-[8/5] w-full overflow-hidden rounded-16 border-1 border-border-muted"
          onPinClick={handlePinClick}
          pins={model.pins}
          route={model.route}
        />
      ) : (
        <div
          aria-hidden
          className="aspect-[8/5] w-full animate-pulse rounded-16 bg-background-lighter"
        />
      )}
      {runtime === 'ready' && scene.placeCards?.length ? (
        <PlaceCardsSurface placeIds={scene.placeCards} surfaceId={surfaceId} />
      ) : null}
      {overlay ? (
        <ImmersiveMapOverlay
          divePinId={overlay.divePinId}
          model={model}
          onClose={() => setOverlay(null)}
          onPinFocus={handlePinFocus}
          title={scene.title}
          weather={bridge?.weather}
        />
      ) : null}
    </figure>
  )
}

function InlineWeatherGlance({
  weather,
}: {
  readonly weather: LookupWeatherOutput | undefined
}) {
  // The glance is anchored to mount time; it does not need to tick live.
  const [now] = useState(() => Date.now())
  const glance = weatherGlance(weather, now)
  if (!glance?.temperatureLabel && !glance?.conditionLabel) return null
  return (
    <span className="flex shrink-0 items-center gap-6 text-body-small text-foreground-muted">
      {glance.iconUrl ? (
        <img alt="" aria-hidden className="size-16" src={glance.iconUrl} />
      ) : null}
      {glance.temperatureLabel ? <span>{glance.temperatureLabel}</span> : null}
      {glance.conditionLabel ? <span>{glance.conditionLabel}</span> : null}
      {glance.attribution ? (
        <a
          className="underline underline-offset-2 transition-colors duration-4 hover:text-accent-black"
          href={glance.attribution.url}
          rel="noreferrer"
          target="_blank"
          title={glance.attribution.title}
        >
          Google
        </a>
      ) : null}
    </span>
  )
}

function PlaceCardsSurface({
  placeIds,
  surfaceId,
}: {
  readonly placeIds: readonly string[]
  readonly surfaceId: string
}) {
  // The surface is processed once per scene identity; rebuilding it on every
  // render would refetch every place card.
  const surface = useMemo(() => {
    const renderer = new A2UIRenderer()
    renderer.processResponse(
      buildPlaceCardsMessages(surfaceId, placeIds).map((message) => ({
        type: 'a2ui' as const,
        message,
      })),
    )
    return renderer.getSurface(surfaceId)
  }, [placeIds, surfaceId])

  if (!surface) return null
  return (
    <maui-providers>
      <a2ui-surface surface={surface} />
    </maui-providers>
  )
}

function ExpandIcon() {
  return <ArrowsOut aria-hidden size={16} weight="regular" />
}
