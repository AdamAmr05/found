import type { MapsCoordinates } from '../../../shared/googleMaps'

// The 3D camera's altitude is absolute meters above sea level, so every scene
// must learn the local terrain height or low-altitude cities render fine while
// elevated ones dive underground.

const elevationCache = new Map<string, Promise<number>>()

function cacheKey(coordinates: MapsCoordinates): string {
  return `${coordinates.latitude.toFixed(4)},${coordinates.longitude.toFixed(4)}`
}

async function fetchElevation(coordinates: MapsCoordinates): Promise<number> {
  const service = new google.maps.ElevationService()
  const { results } = await service.getElevationForLocations({
    locations: [{ lat: coordinates.latitude, lng: coordinates.longitude }],
  })
  const elevation = results[0]?.elevation
  return elevation !== undefined && Number.isFinite(elevation) ? elevation : 0
}

export function groundElevation(coordinates: MapsCoordinates): Promise<number> {
  const key = cacheKey(coordinates)
  const cached = elevationCache.get(key)
  if (cached) return cached
  const pending = fetchElevation(coordinates).catch(() => {
    // Without the Elevation API the scene still renders; sea level is the
    // least-wrong fallback rather than a failure.
    elevationCache.delete(key)
    return 0
  })
  elevationCache.set(key, pending)
  return pending
}
