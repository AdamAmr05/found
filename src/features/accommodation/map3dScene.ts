import type { MapsCoordinates, ShowMapInput } from '../../../shared/googleMaps'

export type MapCamera3D = {
  center: { lat: number; lng: number; altitude: number }
  range: number
  tilt: number
  heading: number
}

export type MapPin3D = {
  id: string
  label: string
  coordinates: MapsCoordinates
  candidateRef?: string
}

export type MapRoute3D = {
  origin: MapsCoordinates
  destination: MapsCoordinates
  travelMode: 'WALKING' | 'DRIVING'
}

export type Map3DSceneModel = {
  pins: MapPin3D[]
  route?: MapRoute3D
  overview: MapCamera3D
}

export const OVERVIEW_TILT = 45
export const OVERVIEW_MIN_RANGE = 900
export const DIVE_RANGE = 300
export const DIVE_TILT = 58
export const DIVE_DURATION_MS = 3_000
export const ORBIT_DURATION_MS = 50_000
export const RETURN_DURATION_MS = 1_800

const EARTH_METERS_PER_DEGREE = 111_320

function boundsOf(points: readonly MapsCoordinates[]) {
  let minLat = Number.POSITIVE_INFINITY
  let maxLat = Number.NEGATIVE_INFINITY
  let minLng = Number.POSITIVE_INFINITY
  let maxLng = Number.NEGATIVE_INFINITY
  for (const point of points) {
    minLat = Math.min(minLat, point.latitude)
    maxLat = Math.max(maxLat, point.latitude)
    minLng = Math.min(minLng, point.longitude)
    maxLng = Math.max(maxLng, point.longitude)
  }
  return { minLat, maxLat, minLng, maxLng }
}

export function overviewCamera(
  points: readonly MapsCoordinates[],
  fallbackCenter: MapsCoordinates,
  groundAltitude = 0,
): MapCamera3D {
  if (points.length === 0) {
    return {
      center: {
        lat: fallbackCenter.latitude,
        lng: fallbackCenter.longitude,
        altitude: groundAltitude,
      },
      range: 2_400,
      tilt: OVERVIEW_TILT,
      heading: 0,
    }
  }

  const { minLat, maxLat, minLng, maxLng } = boundsOf(points)
  const centerLat = (minLat + maxLat) / 2
  const centerLng = (minLng + maxLng) / 2
  const latSpanMeters = (maxLat - minLat) * EARTH_METERS_PER_DEGREE
  const lngSpanMeters =
    (maxLng - minLng) *
    EARTH_METERS_PER_DEGREE *
    Math.cos((centerLat * Math.PI) / 180)
  const spanMeters = Math.hypot(latSpanMeters, lngSpanMeters)

  return {
    center: { lat: centerLat, lng: centerLng, altitude: groundAltitude },
    range: Math.max(OVERVIEW_MIN_RANGE, spanMeters * 1.7),
    tilt: OVERVIEW_TILT,
    heading: 0,
  }
}

export function cameraAtAltitude(
  camera: MapCamera3D,
  groundAltitude: number,
): MapCamera3D {
  return { ...camera, center: { ...camera.center, altitude: groundAltitude } }
}

const DIVE_EYE_OFFSET = 15

export function diveCamera(
  target: MapsCoordinates,
  heading: number,
  groundAltitude: number,
): MapCamera3D {
  return {
    center: {
      lat: target.latitude,
      lng: target.longitude,
      altitude: groundAltitude + DIVE_EYE_OFFSET,
    },
    range: DIVE_RANGE,
    tilt: DIVE_TILT,
    heading,
  }
}

export function sceneModelFromShowMap(scene: ShowMapInput): Map3DSceneModel {
  // The experience deliberately owns its opening shot: frame the actual pins
  // and route, using the agent's center only as a fallback. The protocol's
  // zoom, tilt, and mode remain reserved until agent-directed cameras earn a
  // product role.
  const pins: MapPin3D[] = scene.markers.map((marker, index) => {
    const pin: MapPin3D = {
      id: `pin-${index}`,
      label: marker.label,
      coordinates: marker.coordinates,
    }
    if (marker.candidateRef) pin.candidateRef = marker.candidateRef
    return pin
  })

  const model: Map3DSceneModel = {
    pins,
    overview: overviewCamera(
      [
        ...pins.map((pin) => pin.coordinates),
        ...(scene.route
          ? [
              scene.route.origin.coordinates,
              scene.route.destination.coordinates,
            ]
          : []),
      ],
      scene.camera.center,
    ),
  }
  if (scene.route) {
    model.route = {
      origin: scene.route.origin.coordinates,
      destination: scene.route.destination.coordinates,
      travelMode: scene.route.travelMode === 'walk' ? 'WALKING' : 'DRIVING',
    }
  }
  return model
}

export function scenePinForCandidate(
  model: Map3DSceneModel,
  candidateRef: string,
): MapPin3D | undefined {
  return model.pins.find((pin) => pin.candidateRef === candidateRef)
}

export function sceneCandidateRefs(scene: ShowMapInput): readonly string[] {
  return scene.markers.flatMap((marker) =>
    marker.candidateRef ? [marker.candidateRef] : [],
  )
}
