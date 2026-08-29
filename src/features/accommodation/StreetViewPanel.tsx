import { useEffect, useRef, useState } from 'react'

import type { MapsCoordinates } from '../../../shared/googleMaps'

const PANORAMA_SEARCH_RADIUS_METERS = 90

type StreetViewState = 'loading' | 'ready' | 'unavailable'

export function StreetViewPanel({
  coordinates,
}: {
  readonly coordinates: MapsCoordinates
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<StreetViewState>('loading')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    let panorama: google.maps.StreetViewPanorama | undefined

    async function openPanorama(target: HTMLDivElement) {
      const location = { lat: coordinates.latitude, lng: coordinates.longitude }
      const service = new google.maps.StreetViewService()
      const { data } = await service.getPanorama({
        location,
        radius: PANORAMA_SEARCH_RADIUS_METERS,
        preference: google.maps.StreetViewPreference.NEAREST,
        sources: [
          google.maps.StreetViewSource.GOOGLE,
          google.maps.StreetViewSource.OUTDOOR,
        ],
      })
      const panoLocation = data.location
      if (cancelled || !panoLocation?.pano) return
      const heading = panoLocation.latLng
        ? google.maps.geometry.spherical.computeHeading(
            panoLocation.latLng,
            location,
          )
        : 0
      panorama = new google.maps.StreetViewPanorama(target, {
        pano: panoLocation.pano,
        pov: { heading, pitch: 0 },
        addressControl: false,
        fullscreenControl: false,
        motionTracking: false,
        zoomControl: false,
      })
      if (!cancelled) setState('ready')
    }

    openPanorama(container).catch(() => {
      if (!cancelled) setState('unavailable')
    })
    return () => {
      cancelled = true
      panorama?.setVisible(false)
    }
  }, [coordinates])

  return (
    <div className="relative h-full w-full">
      <div className="h-full w-full" ref={containerRef} />
      {state === 'loading' ? (
        <p className="center text-white-alpha-72 absolute text-body-medium">
          Stepping into the street…
        </p>
      ) : null}
      {state === 'unavailable' ? (
        <p className="center text-white-alpha-72 absolute text-body-medium">
          Street View hasn’t photographed this exact spot.
        </p>
      ) : null}
    </div>
  )
}
