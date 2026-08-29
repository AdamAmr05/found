import { useEffect, useRef, useState } from 'react'

import type { MapCamera3D, MapPin3D, MapRoute3D } from './map3dScene'
import { groundElevation } from './terrainElevation'

const MAP_ATTRIBUTION_ID = 'found_map_scene'

export type Map3DViewProps = {
  readonly camera: MapCamera3D
  readonly pins: readonly MapPin3D[]
  readonly route?: MapRoute3D | undefined
  readonly mode?: 'HYBRID' | 'SATELLITE'
  readonly className?: string
  readonly onPinClick?: (pin: MapPin3D) => void
  readonly onMapReady?: (map: google.maps.maps3d.Map3DElement) => void
}

export function Map3DView({
  camera,
  className,
  mode = 'HYBRID',
  onMapReady,
  onPinClick,
  pins,
  route,
}: Map3DViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.maps3d.Map3DElement>()
  const [visible, setVisible] = useState(false)
  const onPinClickRef = useRef(onPinClick)
  useEffect(() => {
    onPinClickRef.current = onPinClick
  })
  const initialCameraRef = useRef(camera)

  // Each 3D map holds a WebGL context, so a scene claims one only while it is
  // near the viewport and releases it again when scrolled far away.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setVisible(entry.isIntersecting)
      },
      { rootMargin: '600px' },
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !visible) return
    let cancelled = false
    let element: google.maps.maps3d.Map3DElement | undefined
    const initial = initialCameraRef.current

    // The camera altitude is absolute, so the local terrain height must be
    // known before the element exists. Writing the camera after creation
    // would race any flight already animating it.
    void groundElevation({
      latitude: initial.center.lat,
      longitude: initial.center.lng,
    }).then((ground) => {
      if (cancelled || !containerRef.current) return
      element = document.createElement('gmp-map-3d')
      element.mode = mode
      element.center = { ...initial.center, altitude: ground }
      element.range = initial.range
      element.tilt = initial.tilt
      element.heading = initial.heading
      element.internalUsageAttributionIds = [MAP_ATTRIBUTION_ID]
      element.style.display = 'block'
      element.style.width = '100%'
      element.style.height = '100%'
      containerRef.current.append(element)
      setMap(element)
      onMapReady?.(element)
    })

    return () => {
      cancelled = true
      element?.remove()
      setMap(undefined)
    }
    // The map element is created once visible; mode changes recreate the scene.
  }, [mode, onMapReady, visible])

  useEffect(() => {
    if (!map) return
    const markers = pins.map((pin) => {
      const marker = document.createElement('gmp-marker-3d-interactive')
      marker.position = {
        lat: pin.coordinates.latitude,
        lng: pin.coordinates.longitude,
      }
      marker.label = pin.label
      marker.title = pin.label
      marker.addEventListener('gmp-click', () => {
        onPinClickRef.current?.(pin)
      })
      map.append(marker)
      return marker
    })
    return () => {
      for (const marker of markers) marker.remove()
    }
  }, [map, pins])

  useEffect(() => {
    if (!map || !route) return
    const routeElement = document.createElement('gmp-route-3d')
    routeElement.origin = {
      lat: route.origin.latitude,
      lng: route.origin.longitude,
    }
    routeElement.destination = {
      lat: route.destination.latitude,
      lng: route.destination.longitude,
    }
    routeElement.travelMode = route.travelMode
    map.append(routeElement)
    return () => {
      routeElement.remove()
    }
  }, [map, route])

  return <div className={className} ref={containerRef} />
}
