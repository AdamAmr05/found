import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  DIVE_DURATION_MS,
  ORBIT_DURATION_MS,
  RETURN_DURATION_MS,
  cameraAtAltitude,
  diveCamera,
  type Map3DSceneModel,
  type MapPin3D,
} from './map3dScene'
import { flyTo, orbit, stopFlight, waitForSteady } from './map3dChoreography'
import { Map3DView } from './Map3DView'
import { weatherGlance } from './mapWeather'
import { StreetViewPanel } from './StreetViewPanel'
import { groundElevation } from './terrainElevation'
import type { LookupWeatherOutput } from '../../../shared/googleMaps'

const STEADY_WAIT_MS = 4_000

export function ImmersiveMapOverlay({
  divePinId,
  model,
  onClose,
  onPinFocus,
  title,
  weather,
}: {
  readonly divePinId?: string | undefined
  readonly model: Map3DSceneModel
  readonly onClose: () => void
  readonly onPinFocus?: ((pin: MapPin3D) => void) | undefined
  readonly title: string
  readonly weather?: LookupWeatherOutput | undefined
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const mapRef = useRef<google.maps.maps3d.Map3DElement>(null)
  const flightRef = useRef(0)
  const [focusPin, setFocusPin] = useState<MapPin3D>()
  const [street, setStreet] = useState(false)
  const onPinFocusRef = useRef(onPinFocus)
  useEffect(() => {
    onPinFocusRef.current = onPinFocus
  })

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  const diveTo = useCallback((pin: MapPin3D) => {
    const map = mapRef.current
    if (!map) return
    const flight = ++flightRef.current
    setStreet(false)
    setFocusPin(pin)
    onPinFocusRef.current?.(pin)
    stopFlight(map)
    void groundElevation(pin.coordinates).then(async (ground) => {
      // A newer flight owns the camera once the counter moves on.
      if (flightRef.current !== flight) return
      const camera = diveCamera(pin.coordinates, map.heading ?? 0, ground)
      await flyTo(map, camera, DIVE_DURATION_MS)
      await waitForSteady(map, STEADY_WAIT_MS)
      if (flightRef.current === flight) orbit(map, camera, ORBIT_DURATION_MS)
    })
  }, [])

  const backToOverview = useCallback(() => {
    const flight = ++flightRef.current
    setStreet(false)
    setFocusPin(undefined)
    const map = mapRef.current
    if (!map) return
    stopFlight(map)
    void groundElevation({
      latitude: model.overview.center.lat,
      longitude: model.overview.center.lng,
    }).then((ground) => {
      if (flightRef.current !== flight) return
      void flyTo(
        map,
        cameraAtAltitude(model.overview, ground),
        RETURN_DURATION_MS,
      )
    })
  }, [model.overview])

  const handleMapReady = useCallback(
    (map: google.maps.maps3d.Map3DElement) => {
      mapRef.current = map
      if (!divePinId) return
      const pin = model.pins.find((candidate) => candidate.id === divePinId)
      if (pin) diveTo(pin)
    },
    [divePinId, diveTo, model.pins],
  )

  function stepBack(): void {
    if (street) {
      setStreet(false)
      return
    }
    if (focusPin) {
      backToOverview()
      return
    }
    onClose()
  }

  return createPortal(
    <dialog
      className="backdrop:bg-black-alpha-88 h-dvh max-h-none w-dvw max-w-none bg-accent-black p-0"
      onCancel={(event) => {
        if (street || focusPin) {
          event.preventDefault()
          stepBack()
        } else {
          onClose()
        }
      }}
      onClose={onClose}
      onKeyDown={(event) => {
        // The embedded map consumes Escape before the dialog's native cancel.
        if (event.key === 'Escape') {
          event.preventDefault()
          stepBack()
        }
      }}
      ref={dialogRef}
    >
      <div className="relative h-full w-full">
        <Map3DView
          camera={model.overview}
          className="h-full w-full"
          onMapReady={handleMapReady}
          onPinClick={diveTo}
          pins={model.pins}
          route={model.route}
        />
        {street && focusPin ? (
          <div className="absolute inset-0 z-10">
            <StreetViewPanel coordinates={focusPin.coordinates} />
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-16 p-16">
          <div className="pointer-events-auto max-w-480 rounded-12 bg-background-base/85 px-14 py-9 backdrop-blur-sm">
            <p className="text-label-medium text-accent-black">
              {focusPin ? focusPin.label : title}
            </p>
            {focusPin ? (
              <p className="text-body-small text-foreground-muted">
                {street ? 'Standing in the street' : title}
              </p>
            ) : null}
            <WeatherStrip weather={weather} />
          </div>
          <button
            aria-label="Close the map"
            className="pointer-events-auto grid size-36 place-items-center rounded-full bg-background-base/85 text-foreground-muted backdrop-blur-sm transition-colors duration-4 hover:text-accent-black"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center gap-10 p-20">
          {focusPin ? (
            <>
              <button
                className="pointer-events-auto min-h-38 rounded-full bg-background-base/85 px-16 text-label-small text-accent-black backdrop-blur-sm transition-colors duration-4 hover:text-heat-100"
                onClick={backToOverview}
                type="button"
              >
                Back to overview
              </button>
              <button
                className="pointer-events-auto min-h-38 rounded-full bg-heat-100 px-16 text-label-small text-white transition-opacity duration-4 hover:opacity-90"
                onClick={() => setStreet((current) => !current)}
                type="button"
              >
                {street ? 'Back to the sky' : 'Walk the street'}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </dialog>,
    document.body,
  )
}

function WeatherStrip({
  weather,
}: {
  readonly weather: LookupWeatherOutput | undefined
}) {
  // The glance is anchored to mount time; it does not need to tick live.
  const [now] = useState(() => Date.now())
  const glance = weatherGlance(weather, now)
  if (!glance) return null
  return (
    <p className="mt-6 flex items-center gap-8 border-t-1 border-border-faint pt-6 text-body-small text-foreground-muted">
      {glance.iconUrl ? (
        <img alt="" aria-hidden className="size-16" src={glance.iconUrl} />
      ) : null}
      {glance.temperatureLabel ? (
        <span className="text-accent-black">{glance.temperatureLabel}</span>
      ) : null}
      {glance.conditionLabel ? <span>{glance.conditionLabel}</span> : null}
      {glance.sunLabel ? <span>· {glance.sunLabel}</span> : null}
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
    </p>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden fill="none" height="16" viewBox="0 0 16 16" width="16">
      <path
        d="m3.5 3.5 9 9m0-9-9 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}
