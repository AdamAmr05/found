import { describe, expect, it } from 'vitest'
import { Effect } from 'effect'

import { MAPS_SUMMARY_MAX_LENGTH } from '../../shared/googleMaps'
import {
  WALKING_ROUTE_WARNING,
  decodeComputeRoutesResponse,
  decodeLookupWeatherResponse,
  decodeResolveNamesResponse,
  decodeSearchPlacesResponse,
  mapsRequestErrorFromCause,
  normalizeComputeRoutesResponse,
  normalizeLookupWeatherResponse,
  normalizeResolveNamesResponse,
  normalizeSearchPlacesResponse,
  runMapsOperation,
  toComputeRoutesArguments,
  toLookupWeatherArguments,
  toSearchPlacesArguments,
} from './mapsAdapter'

describe('Maps request construction', () => {
  it('maps the search contract onto the provider argument shape', () => {
    expect(
      toSearchPlacesArguments({
        query: 'cafes near Prenzlauer Berg, Berlin',
        locationBias: {
          center: { latitude: 52.54, longitude: 13.41 },
          radiusMeters: 2_000,
        },
        regionCode: 'DE',
      }),
    ).toEqual({
      textQuery: 'cafes near Prenzlauer Berg, Berlin',
      locationBias: {
        circle: {
          center: { latitude: 52.54, longitude: 13.41 },
          radiusMeters: 2_000,
        },
      },
      regionCode: 'DE',
    })
  })

  it('translates waypoint variants and enums into provider casing', () => {
    expect(
      toComputeRoutesArguments({
        origin: { coordinates: { latitude: 52.52, longitude: 13.4 } },
        destination: { placeId: 'ChIJ123' },
        travelMode: 'walk',
      }),
    ).toEqual({
      origin: { latLng: { latitude: 52.52, longitude: 13.4 } },
      destination: { placeId: 'ChIJ123' },
      travelMode: 'WALK',
    })
    expect(
      toLookupWeatherArguments({
        location: { address: 'Alexanderplatz, Berlin' },
        hour: 0,
        units: 'imperial',
      }),
    ).toEqual({
      location: { address: 'Alexanderplatz, Berlin' },
      hour: 0,
      unitsSystem: 'IMPERIAL',
    })
  })
})

describe('Maps place search normalization', () => {
  it('keeps attributable places and derives ids from resource names', async () => {
    const decoded = await Effect.runPromise(
      decodeSearchPlacesResponse({
        summary: 'Two cafes stand out [0] [1].',
        places: [
          {
            place: 'places/ChIJresolved',
            location: { latitude: 52.5, longitude: 13.4 },
            googleMapsLinks: {
              placeUrl: 'https://maps.google.com/?cid=1',
              photosUrl: 'https://maps.google.com/photos/1',
            },
          },
          {
            id: 'ChIJdirect',
            attribution: {
              title: '  Cafe Two - Google Maps  ',
              url: 'https://maps.google.com/?cid=2',
            },
          },
          { location: { latitude: 1, longitude: 1 } },
          {
            id: 'ChIJunattributable',
            googleMapsLinks: { placeUrl: 'not a url' },
          },
        ],
      }),
    )

    expect(normalizeSearchPlacesResponse(decoded)).toEqual({
      summary: 'Two cafes stand out [0] [1].',
      places: [
        {
          placeId: 'ChIJresolved',
          coordinates: { latitude: 52.5, longitude: 13.4 },
          links: {
            place: 'https://maps.google.com/?cid=1',
            photos: 'https://maps.google.com/photos/1',
          },
          attribution: {
            title: 'Google Maps',
            url: 'https://maps.google.com/?cid=1',
          },
        },
        {
          placeId: 'ChIJdirect',
          links: {},
          attribution: {
            title: 'Cafe Two - Google Maps',
            url: 'https://maps.google.com/?cid=2',
          },
        },
      ],
    })
  })

  it('truncates oversized summaries and drops out-of-range coordinates', async () => {
    const decoded = await Effect.runPromise(
      decodeSearchPlacesResponse({
        summary: 'x'.repeat(MAPS_SUMMARY_MAX_LENGTH + 50),
        places: [
          {
            id: 'ChIJbroken',
            location: { latitude: 200, longitude: 13.4 },
            attribution: {
              title: 'Somewhere',
              url: 'https://maps.google.com/?cid=3',
            },
          },
        ],
      }),
    )
    const output = normalizeSearchPlacesResponse(decoded)

    expect(output.summary).toHaveLength(MAPS_SUMMARY_MAX_LENGTH)
    expect(output.places[0]).not.toHaveProperty('coordinates')
  })
})

describe('Maps route normalization', () => {
  it('parses provider durations and carries the mandated walking warning', async () => {
    const decoded = await Effect.runPromise(
      decodeComputeRoutesResponse({
        routes: [
          {
            distanceMeters: 3_203,
            duration: '2666s',
            attribution: {
              title: 'A to B - Google Maps',
              url: 'https://www.google.com/maps/dir/A/B',
            },
          },
        ],
      }),
    )

    expect(normalizeComputeRoutesResponse(decoded, 'walk')).toEqual({
      routes: [
        {
          distanceMeters: 3_203,
          durationSeconds: 2_666,
          attribution: {
            title: 'A to B - Google Maps',
            url: 'https://www.google.com/maps/dir/A/B',
          },
          warning: WALKING_ROUTE_WARNING,
        },
      ],
    })
  })

  it('drops routes that are missing duration, distance, or attribution', async () => {
    const decoded = await Effect.runPromise(
      decodeComputeRoutesResponse({
        routes: [
          { distanceMeters: 100, duration: 'soon' },
          { duration: '10s' },
          { distanceMeters: 100, duration: '10s' },
        ],
      }),
    )

    expect(normalizeComputeRoutesResponse(decoded, 'drive')).toEqual({
      routes: [],
    })
  })
})

describe('Maps weather normalization', () => {
  it('projects provider enums into product tokens and units', async () => {
    const decoded = await Effect.runPromise(
      decodeLookupWeatherResponse({
        weatherCondition: {
          type: 'PARTLY_CLOUDY',
          description: { text: 'Partly cloudy' },
          iconBaseUri: 'https://maps.gstatic.com/weather/v1/partly_cloudy',
        },
        temperature: { degrees: 21.4, unit: 'CELSIUS' },
        feelsLikeTemperature: { degrees: 20.1, unit: 'CELSIUS' },
        relativeHumidity: 62,
        cloudCover: 40,
        thunderstormProbability: 10,
        uvIndex: 4,
        precipitation: { probability: { percent: 15, type: 'RAIN' } },
        wind: {
          speed: { value: 12, unit: 'KILOMETERS_PER_HOUR' },
          direction: { degrees: 270, cardinal: 'WEST' },
        },
        sunEvents: {
          sunriseTime: '2026-08-29T04:21:00Z',
          sunsetTime: '2026-08-29T18:04:00Z',
        },
        moonEvents: { moonPhase: 'WAXING_GIBBOUS' },
        returnedLocation: { address: 'Berlin, Germany' },
        attribution: {
          title: 'Weather - Google',
          url: 'https://www.google.com/maps',
        },
      }),
    )

    expect(normalizeLookupWeatherResponse(decoded)).toEqual({
      locationLabel: 'Berlin, Germany',
      condition: {
        token: 'partly_cloudy',
        description: 'Partly cloudy',
        iconBaseUri: 'https://maps.gstatic.com/weather/v1/partly_cloudy',
      },
      temperature: { degrees: 21.4, unit: 'celsius' },
      feelsLike: { degrees: 20.1, unit: 'celsius' },
      relativeHumidity: 62,
      cloudCover: 40,
      thunderstormProbability: 10,
      uvIndex: 4,
      precipitationProbability: { percent: 15, type: 'rain' },
      wind: {
        speed: { value: 12, unit: 'kmh' },
        directionDegrees: 270,
        directionCardinal: 'west',
      },
      sun: {
        sunriseTime: '2026-08-29T04:21:00Z',
        sunsetTime: '2026-08-29T18:04:00Z',
      },
      moonPhase: 'waxing_gibbous',
      attribution: {
        title: 'Weather - Google',
        url: 'https://www.google.com/maps',
      },
    })
  })

  it('omits unspecified enums and out-of-range readings instead of guessing', async () => {
    const decoded = await Effect.runPromise(
      decodeLookupWeatherResponse({
        weatherCondition: { type: 'TYPE_UNSPECIFIED' },
        temperature: { degrees: 21.4, unit: 'UNIT_UNSPECIFIED' },
        relativeHumidity: 140,
        wind: { speed: { value: -2, unit: 'KILOMETERS_PER_HOUR' } },
      }),
    )

    expect(normalizeLookupWeatherResponse(decoded)).toEqual({})
  })
})

describe('Maps weather live payload', () => {
  it('decodes and normalizes a captured provider response', async () => {
    const raw: unknown = (await import('./lookupWeatherFixture.json')).default
    const decoded = await Effect.runPromise(decodeLookupWeatherResponse(raw))
    const output = normalizeLookupWeatherResponse(decoded)

    expect(output.temperature).toEqual({ degrees: 24.5, unit: 'celsius' })
    expect(output.condition?.token).toBe('partly_cloudy')
    expect(output.attribution?.url).toContain('google.com')
  })
})

describe('Maps place resolution normalization', () => {
  it('aligns results with input queries and keeps failures explicit', async () => {
    const decoded = await Effect.runPromise(
      decodeResolveNamesResponse({
        results: [
          { confidence: 'HIGH', entity: { place: 'places/ChIJfound' } },
          {},
        ],
      }),
    )

    expect(
      normalizeResolveNamesResponse(decoded, [
        { text: 'Brandenburger Tor, Berlin' },
        { text: 'nowhere at all' },
      ]),
    ).toEqual({
      results: [
        {
          query: 'Brandenburger Tor, Berlin',
          placeId: 'ChIJfound',
          confidence: 'high',
        },
        { query: 'nowhere at all' },
      ],
    })
  })
})

describe('Maps operation failures', () => {
  it('replaces provider and decode failures with one compact error', async () => {
    const failure = mapsRequestErrorFromCause('search_places')(
      new Error('private provider payload'),
    )

    await expect(
      runMapsOperation('search_places', Effect.fail(failure)),
    ).rejects.toMatchObject({
      data: { code: 'MAPS_OPERATION_FAILED', tool: 'search_places' },
    })
  })

  it('rejects malformed provider payloads before normalization', async () => {
    await expect(
      Effect.runPromise(decodeSearchPlacesResponse({ places: [{ id: 42 }] })),
    ).rejects.toBeDefined()
    await expect(
      Effect.runPromise(decodeComputeRoutesResponse({ routes: 'nope' })),
    ).rejects.toBeDefined()
  })
})
