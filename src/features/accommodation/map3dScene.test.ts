import { describe, expect, it } from 'vitest'

import { showMapInputSchema } from '../../../shared/googleMaps'
import {
  DIVE_RANGE,
  DIVE_TILT,
  OVERVIEW_MIN_RANGE,
  OVERVIEW_TILT,
  diveCamera,
  overviewCamera,
  sceneCandidateRefs,
  sceneModelFromShowMap,
  scenePinForCandidate,
} from './map3dScene'

const scene = showMapInputSchema.parse({
  title: 'Candidates in Prenzlauer Berg',
  camera: { center: { latitude: 52.52, longitude: 13.4 }, zoom: 14 },
  markers: [
    {
      label: 'Flat on Raumerstraße',
      coordinates: { latitude: 52.541, longitude: 13.417 },
      candidateRef: 'c1',
    },
    {
      label: 'Kollwitzplatz',
      coordinates: { latitude: 52.536, longitude: 13.418 },
    },
  ],
  route: {
    origin: {
      label: 'Flat on Raumerstraße',
      coordinates: { latitude: 52.541, longitude: 13.417 },
    },
    destination: {
      label: 'Office',
      coordinates: { latitude: 52.52, longitude: 13.39 },
    },
    travelMode: 'walk',
  },
})

describe('Map scene model', () => {
  it('builds pins, a route, and a fitted overview from a showMap scene', () => {
    const model = sceneModelFromShowMap(scene)

    expect(model.pins).toEqual([
      {
        id: 'pin-0',
        label: 'Flat on Raumerstraße',
        coordinates: { latitude: 52.541, longitude: 13.417 },
        candidateRef: 'c1',
      },
      {
        id: 'pin-1',
        label: 'Kollwitzplatz',
        coordinates: { latitude: 52.536, longitude: 13.418 },
      },
    ])
    expect(model.route).toEqual({
      origin: { latitude: 52.541, longitude: 13.417 },
      destination: { latitude: 52.52, longitude: 13.39 },
      travelMode: 'WALKING',
    })
    expect(model.overview.tilt).toBe(OVERVIEW_TILT)
    expect(model.overview.center.lat).toBeCloseTo(52.5305, 3)
    expect(model.overview.range).toBeGreaterThan(OVERVIEW_MIN_RANGE)
  })

  it('links pins to candidates by ref', () => {
    const model = sceneModelFromShowMap(scene)

    expect(scenePinForCandidate(model, 'c1')?.id).toBe('pin-0')
    expect(scenePinForCandidate(model, 'missing')).toBeUndefined()
    expect(sceneCandidateRefs(scene)).toEqual(['c1'])
  })

  it('falls back to the agent camera when a scene has no geometry', () => {
    const overview = overviewCamera([], { latitude: 48.86, longitude: 2.35 })

    expect(overview.center).toEqual({ lat: 48.86, lng: 2.35, altitude: 0 })
    expect(overview.range).toBeGreaterThan(0)
  })

  it('frames a dive just above the local terrain height', () => {
    const camera = diveCamera({ latitude: 48.4, longitude: 9.99 }, 120, 478)

    expect(camera).toEqual({
      center: { lat: 48.4, lng: 9.99, altitude: 493 },
      range: DIVE_RANGE,
      tilt: DIVE_TILT,
      heading: 120,
    })
  })
})
