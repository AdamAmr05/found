import { createTool } from '@convex-dev/agent'

import {
  computeRoutesInputSchema,
  computeRoutesOutputSchema,
  lookupWeatherInputSchema,
  lookupWeatherOutputSchema,
  resolvePlacesInputSchema,
  resolvePlacesOutputSchema,
  searchPlacesInputSchema,
  searchPlacesOutputSchema,
} from '../../shared/googleMaps'
import { env } from '../_generated/server'
import {
  normalizeComputeRoutesResponse,
  normalizeLookupWeatherResponse,
  normalizeResolveNamesResponse,
  normalizeSearchPlacesResponse,
  requestComputeRoutes,
  requestLookupWeather,
  requestResolvePlaces,
  requestSearchPlaces,
  runMapsOperation,
} from './mapsAdapter'

export const searchPlaces = createTool({
  description: [
    'Search Google Maps for real places, businesses, addresses, and points of interest.',
    'The query must carry enough geographic context to be unambiguous; include the city or neighborhood, or pass locationBias with known coordinates.',
    'Returns a grounded natural-language summary whose citations like [0] refer to entries of the returned places list.',
    'Use this for neighborhood context, nearby amenities, and verifying that a location actually exists.',
  ].join(' '),
  inputSchema: searchPlacesInputSchema,
  outputSchema: searchPlacesOutputSchema,
  execute: async (_ctx, input, options) => {
    const decoded = await runMapsOperation(
      'search_places',
      requestSearchPlaces(env.GOOGLE_MAPS_API_KEY, input, options.abortSignal),
    )
    return normalizeSearchPlacesResponse(decoded)
  },
})

export const computeRoutes = createTool({
  description: [
    'Compute the real travel distance and duration between two locations via Google Maps, driving or walking.',
    'Waypoints accept a specific address, coordinates, or a placeId from searchPlaces or resolvePlaces.',
    'Returns distance and duration only, without turn-by-turn directions.',
    'Use this to answer commute and reachability questions instead of estimating.',
  ].join(' '),
  inputSchema: computeRoutesInputSchema,
  outputSchema: computeRoutesOutputSchema,
  execute: async (_ctx, input, options) => {
    const decoded = await runMapsOperation(
      'compute_routes',
      requestComputeRoutes(env.GOOGLE_MAPS_API_KEY, input, options.abortSignal),
    )
    return normalizeComputeRoutesResponse(decoded, input.travelMode)
  },
})

export const lookupWeather = createTool({
  description: [
    'Look up current weather conditions or a forecast for a location via Google Maps.',
    'The location accepts a specific address, coordinates, or a placeId.',
    "Omit date and hour for current conditions; date alone gives a daily forecast and date plus hour gives an hourly forecast, both in the location's local time zone.",
    'Forecasts reach at most 10 days ahead.',
  ].join(' '),
  inputSchema: lookupWeatherInputSchema,
  outputSchema: lookupWeatherOutputSchema,
  execute: async (_ctx, input, options) => {
    const decoded = await runMapsOperation(
      'lookup_weather',
      requestLookupWeather(env.GOOGLE_MAPS_API_KEY, input, options.abortSignal),
    )
    return normalizeLookupWeatherResponse(decoded)
  },
})

export const resolvePlaces = createTool({
  description: [
    'Resolve up to 20 specific place names or exact addresses into canonical Google Maps place IDs in one batch.',
    'Each query must name one specific place, such as an address from a listing.',
    'A result without a placeId means Google Maps could not resolve that query.',
    'Use this to anchor known candidate locations on Google Maps before spatial reasoning or presentation.',
  ].join(' '),
  inputSchema: resolvePlacesInputSchema,
  outputSchema: resolvePlacesOutputSchema,
  execute: async (_ctx, input, options) => {
    const decoded = await runMapsOperation(
      'resolve_names',
      requestResolvePlaces(env.GOOGLE_MAPS_API_KEY, input, options.abortSignal),
    )
    return normalizeResolveNamesResponse(decoded, input.queries)
  },
})
