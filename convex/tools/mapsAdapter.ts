import { createMCPClient } from '@ai-sdk/mcp'
import { ConvexError } from 'convex/values'
import { Effect, Predicate, Schema } from 'effect'

import {
  MAPS_PLACE_MAX_COUNT,
  MAPS_ATTRIBUTION_TITLE_MAX_LENGTH,
  MAPS_CONDITION_TOKEN_MAX_LENGTH,
  MAPS_RESOLVE_MAX_COUNT,
  MAPS_ROUTE_MAX_COUNT,
  MAPS_SUMMARY_MAX_LENGTH,
  MAPS_TEXT_LABEL_MAX_LENGTH,
  type ComputeRoutesInput,
  type ComputeRoutesOutput,
  type LookupWeatherInput,
  type LookupWeatherOutput,
  type MapsAttribution,
  type MapsCoordinates,
  type MapsWaypoint,
  type ResolvePlacesInput,
  type ResolvePlacesOutput,
  type SearchPlacesInput,
  type SearchPlacesOutput,
} from '../../shared/googleMaps'
import { isHttpUrl } from '../../shared/httpUrl'
import { truncateText } from '../../shared/text'

export const MAPS_MCP_URL = 'https://mapstools.googleapis.com/mcp'
export const MAPS_CALL_TIMEOUT_MS = 30_000

export const WALKING_ROUTE_WARNING =
  'Walking routes are in beta and may be missing clear sidewalks or pedestrian paths.'

type MapsTool =
  'search_places' | 'compute_routes' | 'lookup_weather' | 'resolve_names'

type ProviderWaypointArgument =
  { address: string } | { latLng: MapsCoordinates } | { placeId: string }

type ProviderCircleArgument = {
  center: MapsCoordinates
  radiusMeters?: number
}

export type SearchPlacesArguments = {
  textQuery: string
  locationBias?: { circle: ProviderCircleArgument }
  languageCode?: string
  regionCode?: string
}

export type ComputeRoutesArguments = {
  origin: ProviderWaypointArgument
  destination: ProviderWaypointArgument
  travelMode: 'DRIVE' | 'WALK'
}

export type LookupWeatherArguments = {
  location: ProviderWaypointArgument
  date?: { year: number; month: number; day: number }
  hour?: number
  unitsSystem?: 'METRIC' | 'IMPERIAL'
}

export type ResolveNamesArguments = {
  queries: { text: string }[]
  regionCode?: string
}

export type MapsToolArguments =
  | SearchPlacesArguments
  | ComputeRoutesArguments
  | LookupWeatherArguments
  | ResolveNamesArguments

export class MapsRequestError extends Schema.TaggedError<MapsRequestError>()(
  'MapsRequestError',
  {
    cause: Schema.Defect(),
    tool: Schema.String,
    reason: Schema.Literals(['transport', 'provider']),
  },
) {}

// Marks failures the provider itself declared, which retrying cannot fix.
class ProviderDeclaredError extends Error {}

export function mapsRequestErrorFromCause(tool: MapsTool) {
  // oxlint-disable-next-line anti-slop/no-unknown-parameters -- A rejected provider Promise is untrusted here and is immediately reduced to safe diagnostics.
  return (cause: unknown) =>
    new MapsRequestError({
      cause,
      tool,
      reason: cause instanceof ProviderDeclaredError ? 'provider' : 'transport',
    })
}

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- MCP result content is untrusted here and is immediately reduced to a diagnostic string.
function describeToolError(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined
  const texts = content.flatMap((part) =>
    Predicate.isObject(part) &&
    part['type'] === 'text' &&
    Predicate.isString(part['text'])
      ? [part['text']]
      : [],
  )
  return texts.length > 0 ? texts.join('\n') : undefined
}

function groundingLiteRequest<
  S extends Schema.Constraint & { readonly DecodingServices: never },
>(args: {
  apiKey: string
  tool: MapsTool
  input: MapsToolArguments
  responseSchema: S
  signal?: AbortSignal | undefined
}): Effect.Effect<S['Type'], MapsFailure> {
  return Effect.tryPromise({
    try: async () => {
      const client = await createMCPClient({
        transport: {
          type: 'http',
          url: MAPS_MCP_URL,
          headers: { 'X-Goog-Api-Key': args.apiKey },
        },
      })
      try {
        const result = await client.callTool({
          name: args.tool,
          arguments: args.input,
          options: args.signal
            ? { timeout: MAPS_CALL_TIMEOUT_MS, signal: args.signal }
            : { timeout: MAPS_CALL_TIMEOUT_MS },
        })
        if (result.isError) {
          throw new ProviderDeclaredError(
            describeToolError(result.content) ??
              `Maps tool ${args.tool} reported an error`,
          )
        }
        if (result.structuredContent === undefined) {
          throw new ProviderDeclaredError(
            `Maps tool ${args.tool} returned no structured content`,
          )
        }
        return result.structuredContent
      } finally {
        await client.close()
      }
    },
    catch: mapsRequestErrorFromCause(args.tool),
  }).pipe(
    // These are pure reads, so one retry absorbs transient transport
    // failures. Provider-declared errors are deterministic and never retried.
    Effect.retry({ times: 1, while: (error) => error.reason === 'transport' }),
    Effect.flatMap((content) =>
      Schema.decodeUnknownEffect(args.responseSchema)(content),
    ),
  )
}

const providerAttributionSchema = Schema.Struct({
  title: Schema.optionalKey(Schema.String),
  url: Schema.optionalKey(Schema.String),
})

const providerLatLngSchema = Schema.Struct({
  latitude: Schema.optionalKey(Schema.Number),
  longitude: Schema.optionalKey(Schema.Number),
})

const providerSearchPlacesSchema = Schema.Struct({
  summary: Schema.optionalKey(Schema.String),
  places: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        id: Schema.optionalKey(Schema.String),
        place: Schema.optionalKey(Schema.String),
        location: Schema.optionalKey(providerLatLngSchema),
        googleMapsLinks: Schema.optionalKey(
          Schema.Struct({
            placeUrl: Schema.optionalKey(Schema.String),
            directionsUrl: Schema.optionalKey(Schema.String),
            photosUrl: Schema.optionalKey(Schema.String),
            reviewsUrl: Schema.optionalKey(Schema.String),
          }),
        ),
        attribution: Schema.optionalKey(providerAttributionSchema),
      }),
    ),
  ),
})

const providerComputeRoutesSchema = Schema.Struct({
  routes: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        distanceMeters: Schema.optionalKey(Schema.Number),
        duration: Schema.optionalKey(Schema.String),
        attribution: Schema.optionalKey(providerAttributionSchema),
      }),
    ),
  ),
})

const providerTemperatureSchema = Schema.Struct({
  degrees: Schema.optionalKey(Schema.Number),
  unit: Schema.optionalKey(Schema.String),
})

const providerWindSpeedSchema = Schema.Struct({
  value: Schema.optionalKey(Schema.Number),
  unit: Schema.optionalKey(Schema.String),
})

const providerLookupWeatherSchema = Schema.Struct({
  weatherCondition: Schema.optionalKey(
    Schema.Struct({
      type: Schema.optionalKey(Schema.String),
      description: Schema.optionalKey(
        Schema.Struct({ text: Schema.optionalKey(Schema.String) }),
      ),
      iconBaseUri: Schema.optionalKey(Schema.String),
    }),
  ),
  temperature: Schema.optionalKey(providerTemperatureSchema),
  feelsLikeTemperature: Schema.optionalKey(providerTemperatureSchema),
  minTemperature: Schema.optionalKey(providerTemperatureSchema),
  maxTemperature: Schema.optionalKey(providerTemperatureSchema),
  relativeHumidity: Schema.optionalKey(Schema.Number),
  cloudCover: Schema.optionalKey(Schema.Number),
  uvIndex: Schema.optionalKey(Schema.Number),
  thunderstormProbability: Schema.optionalKey(Schema.Number),
  precipitation: Schema.optionalKey(
    Schema.Struct({
      probability: Schema.optionalKey(
        Schema.Struct({
          percent: Schema.optionalKey(Schema.Number),
          type: Schema.optionalKey(Schema.String),
        }),
      ),
    }),
  ),
  wind: Schema.optionalKey(
    Schema.Struct({
      speed: Schema.optionalKey(providerWindSpeedSchema),
      gust: Schema.optionalKey(providerWindSpeedSchema),
      direction: Schema.optionalKey(
        Schema.Struct({
          degrees: Schema.optionalKey(Schema.Number),
          cardinal: Schema.optionalKey(Schema.String),
        }),
      ),
    }),
  ),
  sunEvents: Schema.optionalKey(
    Schema.Struct({
      sunriseTime: Schema.optionalKey(Schema.String),
      sunsetTime: Schema.optionalKey(Schema.String),
    }),
  ),
  moonEvents: Schema.optionalKey(
    Schema.Struct({ moonPhase: Schema.optionalKey(Schema.String) }),
  ),
  returnedLocation: Schema.optionalKey(
    Schema.Struct({ address: Schema.optionalKey(Schema.String) }),
  ),
  attribution: Schema.optionalKey(providerAttributionSchema),
})

const providerResolveNamesSchema = Schema.Struct({
  results: Schema.optionalKey(
    Schema.Array(
      Schema.Struct({
        confidence: Schema.optionalKey(Schema.String),
        entity: Schema.optionalKey(
          Schema.Struct({ place: Schema.optionalKey(Schema.String) }),
        ),
      }),
    ),
  ),
})

type ProviderSearchPlaces = Schema.Schema.Type<
  typeof providerSearchPlacesSchema
>
type ProviderComputeRoutes = Schema.Schema.Type<
  typeof providerComputeRoutesSchema
>
type ProviderLookupWeather = Schema.Schema.Type<
  typeof providerLookupWeatherSchema
>
type ProviderResolveNames = Schema.Schema.Type<
  typeof providerResolveNamesSchema
>

export const decodeSearchPlacesResponse = Schema.decodeUnknownEffect(
  providerSearchPlacesSchema,
)
export const decodeComputeRoutesResponse = Schema.decodeUnknownEffect(
  providerComputeRoutesSchema,
)
export const decodeLookupWeatherResponse = Schema.decodeUnknownEffect(
  providerLookupWeatherSchema,
)
export const decodeResolveNamesResponse = Schema.decodeUnknownEffect(
  providerResolveNamesSchema,
)

type MapsFailure = MapsRequestError | Schema.SchemaError

function logMapsFailure(tool: MapsTool, error: MapsFailure) {
  const annotations =
    error instanceof MapsRequestError
      ? { failureKind: 'request' }
      : { failureKind: 'response_decode', providerError: error.name }

  return Effect.logError('Maps grounding operation failed').pipe(
    Effect.annotateLogs({ tool, ...annotations }),
  )
}

export function runMapsOperation<A>(
  tool: MapsTool,
  effect: Effect.Effect<A, MapsFailure>,
): Promise<A> {
  return Effect.runPromise(
    effect.pipe(
      Effect.tapError((error) => logMapsFailure(tool, error)),
      Effect.mapError(
        () => new ConvexError({ code: 'MAPS_OPERATION_FAILED', tool }),
      ),
    ),
  )
}

export function requestSearchPlaces(
  apiKey: string,
  input: SearchPlacesInput,
  signal?: AbortSignal,
) {
  return groundingLiteRequest({
    apiKey,
    tool: 'search_places',
    input: toSearchPlacesArguments(input),
    responseSchema: providerSearchPlacesSchema,
    signal,
  })
}

export function requestComputeRoutes(
  apiKey: string,
  input: ComputeRoutesInput,
  signal?: AbortSignal,
) {
  return groundingLiteRequest({
    apiKey,
    tool: 'compute_routes',
    input: toComputeRoutesArguments(input),
    responseSchema: providerComputeRoutesSchema,
    signal,
  })
}

export function requestLookupWeather(
  apiKey: string,
  input: LookupWeatherInput,
  signal?: AbortSignal,
) {
  return groundingLiteRequest({
    apiKey,
    tool: 'lookup_weather',
    input: toLookupWeatherArguments(input),
    responseSchema: providerLookupWeatherSchema,
    signal,
  })
}

export function requestResolvePlaces(
  apiKey: string,
  input: ResolvePlacesInput,
  signal?: AbortSignal,
) {
  return groundingLiteRequest({
    apiKey,
    tool: 'resolve_names',
    input: toResolveNamesArguments(input),
    responseSchema: providerResolveNamesSchema,
    signal,
  })
}

export function toSearchPlacesArguments(
  input: SearchPlacesInput,
): SearchPlacesArguments {
  const args: SearchPlacesArguments = { textQuery: input.query }
  if (input.locationBias) {
    const circle: ProviderCircleArgument = { center: input.locationBias.center }
    if (input.locationBias.radiusMeters !== undefined) {
      circle.radiusMeters = input.locationBias.radiusMeters
    }
    args.locationBias = { circle }
  }
  if (input.languageCode) args.languageCode = input.languageCode
  if (input.regionCode) args.regionCode = input.regionCode
  return args
}

function toWaypointArgument(waypoint: MapsWaypoint): ProviderWaypointArgument {
  if ('address' in waypoint) return { address: waypoint.address }
  if ('coordinates' in waypoint) return { latLng: waypoint.coordinates }
  return { placeId: waypoint.placeId }
}

export function toComputeRoutesArguments(
  input: ComputeRoutesInput,
): ComputeRoutesArguments {
  return {
    origin: toWaypointArgument(input.origin),
    destination: toWaypointArgument(input.destination),
    travelMode: input.travelMode === 'walk' ? 'WALK' : 'DRIVE',
  }
}

export function toLookupWeatherArguments(
  input: LookupWeatherInput,
): LookupWeatherArguments {
  const args: LookupWeatherArguments = {
    location: toWaypointArgument(input.location),
  }
  if (input.date) args.date = input.date
  if (input.hour !== undefined) args.hour = input.hour
  if (input.units) {
    args.unitsSystem = input.units === 'imperial' ? 'IMPERIAL' : 'METRIC'
  }
  return args
}

export function toResolveNamesArguments(
  input: ResolvePlacesInput,
): ResolveNamesArguments {
  const args: ResolveNamesArguments = {
    queries: input.queries.map((query) => ({ text: query.text })),
  }
  if (input.regionCode) args.regionCode = input.regionCode
  return args
}

function nonEmpty(value: string | undefined): string | undefined {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function contractUrl(value: string | undefined): string | undefined {
  const normalized = nonEmpty(value)
  return normalized && normalized.length <= 2_048 && isHttpUrl(normalized)
    ? normalized
    : undefined
}

type ProviderAttribution = Schema.Schema.Type<typeof providerAttributionSchema>

function toAttribution(
  attribution: ProviderAttribution | undefined,
  fallbackUrl?: string,
): MapsAttribution | undefined {
  const url = contractUrl(attribution?.url) ?? contractUrl(fallbackUrl)
  if (!url) return undefined
  const title = nonEmpty(attribution?.title) ?? 'Google Maps'
  return { title: truncateText(title, MAPS_ATTRIBUTION_TITLE_MAX_LENGTH), url }
}

function toPlaceId(
  id: string | undefined,
  resourceName: string | undefined,
): string | undefined {
  const direct = nonEmpty(id)
  if (direct) return direct
  const resource = nonEmpty(resourceName)
  if (resource?.startsWith('places/')) {
    return nonEmpty(resource.slice('places/'.length))
  }
  return undefined
}

type ProviderLatLng = Schema.Schema.Type<typeof providerLatLngSchema>

function toCoordinates(
  location: ProviderLatLng | undefined,
): MapsCoordinates | undefined {
  const latitude = location?.latitude
  const longitude = location?.longitude
  if (latitude === undefined || longitude === undefined) return undefined
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return undefined
  return { latitude, longitude }
}

type SearchPlaceEntry = SearchPlacesOutput['places'][number]

function toPlaceEntry(
  place: NonNullable<ProviderSearchPlaces['places']>[number],
): SearchPlaceEntry | undefined {
  const placeId = toPlaceId(place.id, place.place)
  if (!placeId) return undefined

  const links: SearchPlaceEntry['links'] = {}
  const placeUrl = contractUrl(place.googleMapsLinks?.placeUrl)
  const directionsUrl = contractUrl(place.googleMapsLinks?.directionsUrl)
  const photosUrl = contractUrl(place.googleMapsLinks?.photosUrl)
  const reviewsUrl = contractUrl(place.googleMapsLinks?.reviewsUrl)
  if (placeUrl) links.place = placeUrl
  if (directionsUrl) links.directions = directionsUrl
  if (photosUrl) links.photos = photosUrl
  if (reviewsUrl) links.reviews = reviewsUrl

  // A place that cannot be attributed to a Google Maps link may not be shown.
  const attribution = toAttribution(place.attribution, placeUrl)
  if (!attribution) return undefined

  const entry: SearchPlaceEntry = { placeId, links, attribution }
  const coordinates = toCoordinates(place.location)
  if (coordinates) entry.coordinates = coordinates
  return entry
}

export function normalizeSearchPlacesResponse(
  response: ProviderSearchPlaces,
): SearchPlacesOutput {
  const places: SearchPlacesOutput['places'] = []

  for (const place of response.places ?? []) {
    if (places.length === MAPS_PLACE_MAX_COUNT) break
    const entry = toPlaceEntry(place)
    if (entry) places.push(entry)
  }

  return {
    summary: truncateText(response.summary ?? '', MAPS_SUMMARY_MAX_LENGTH),
    places,
  }
}

const DURATION_PATTERN = /^(\d+(?:\.\d+)?)s$/

export function normalizeComputeRoutesResponse(
  response: ProviderComputeRoutes,
  travelMode: ComputeRoutesInput['travelMode'],
): ComputeRoutesOutput {
  const routes: ComputeRoutesOutput['routes'] = []

  for (const route of response.routes ?? []) {
    if (routes.length === MAPS_ROUTE_MAX_COUNT) break
    const durationMatch = nonEmpty(route.duration)?.match(DURATION_PATTERN)
    const durationSeconds = durationMatch?.[1]
      ? Number(durationMatch[1])
      : undefined
    const distanceMeters = route.distanceMeters
    const attribution = toAttribution(route.attribution)
    if (
      durationSeconds === undefined ||
      distanceMeters === undefined ||
      !Number.isInteger(distanceMeters) ||
      distanceMeters < 0 ||
      !attribution
    ) {
      continue
    }

    const entry: ComputeRoutesOutput['routes'][number] = {
      distanceMeters,
      durationSeconds,
      attribution,
    }
    if (travelMode === 'walk') entry.warning = WALKING_ROUTE_WARNING
    routes.push(entry)
  }

  return { routes }
}

function toConditionToken(value: string | undefined): string | undefined {
  const normalized = nonEmpty(value)
  if (!normalized || normalized.endsWith('_UNSPECIFIED')) return undefined
  return truncateText(normalized.toLowerCase(), MAPS_CONDITION_TOKEN_MAX_LENGTH)
}

const TEMPERATURE_UNITS = new Map<string, 'celsius' | 'fahrenheit'>([
  ['CELSIUS', 'celsius'],
  ['FAHRENHEIT', 'fahrenheit'],
])

const WIND_SPEED_UNITS = new Map<string, 'kmh' | 'mph'>([
  ['KILOMETERS_PER_HOUR', 'kmh'],
  ['MILES_PER_HOUR', 'mph'],
])

type ProviderTemperature = Schema.Schema.Type<typeof providerTemperatureSchema>

function toTemperature(temperature: ProviderTemperature | undefined) {
  const unit = temperature?.unit
    ? TEMPERATURE_UNITS.get(temperature.unit)
    : undefined
  if (temperature?.degrees === undefined || !unit) return undefined
  return { degrees: temperature.degrees, unit }
}

type ProviderWindSpeed = Schema.Schema.Type<typeof providerWindSpeedSchema>

function toWindSpeed(speed: ProviderWindSpeed | undefined) {
  const unit = speed?.unit ? WIND_SPEED_UNITS.get(speed.unit) : undefined
  if (speed?.value === undefined || speed.value < 0 || !unit) return undefined
  return { value: speed.value, unit }
}

function toPercent(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isInteger(value)) return undefined
  return value >= 0 && value <= 100 ? value : undefined
}

function toCondition(
  condition: ProviderLookupWeather['weatherCondition'],
): LookupWeatherOutput['condition'] {
  const token = toConditionToken(condition?.type)
  if (!token) return undefined
  const result: NonNullable<LookupWeatherOutput['condition']> = { token }
  const description = nonEmpty(condition?.description?.text)
  if (description) {
    result.description = truncateText(description, MAPS_TEXT_LABEL_MAX_LENGTH)
  }
  const iconBaseUri = contractUrl(condition?.iconBaseUri)
  if (iconBaseUri) result.iconBaseUri = iconBaseUri
  return result
}

function assignTemperatures(
  output: LookupWeatherOutput,
  response: ProviderLookupWeather,
): void {
  const temperature = toTemperature(response.temperature)
  if (temperature) output.temperature = temperature
  const feelsLike = toTemperature(response.feelsLikeTemperature)
  if (feelsLike) output.feelsLike = feelsLike
  const minTemperature = toTemperature(response.minTemperature)
  if (minTemperature) output.minTemperature = minTemperature
  const maxTemperature = toTemperature(response.maxTemperature)
  if (maxTemperature) output.maxTemperature = maxTemperature
}

function assignAtmosphere(
  output: LookupWeatherOutput,
  response: ProviderLookupWeather,
): void {
  const relativeHumidity = toPercent(response.relativeHumidity)
  if (relativeHumidity !== undefined) output.relativeHumidity = relativeHumidity
  const cloudCover = toPercent(response.cloudCover)
  if (cloudCover !== undefined) output.cloudCover = cloudCover
  const thunderstormProbability = toPercent(response.thunderstormProbability)
  if (thunderstormProbability !== undefined) {
    output.thunderstormProbability = thunderstormProbability
  }
  if (
    response.uvIndex !== undefined &&
    Number.isInteger(response.uvIndex) &&
    response.uvIndex >= 0
  ) {
    output.uvIndex = response.uvIndex
  }
  const percent = toPercent(response.precipitation?.probability?.percent)
  if (percent !== undefined) {
    const probability: NonNullable<
      LookupWeatherOutput['precipitationProbability']
    > = { percent }
    const type = toConditionToken(response.precipitation?.probability?.type)
    if (type) probability.type = type
    output.precipitationProbability = probability
  }
}

function toWind(
  wind: ProviderLookupWeather['wind'],
): LookupWeatherOutput['wind'] {
  const result: NonNullable<LookupWeatherOutput['wind']> = {}
  const speed = toWindSpeed(wind?.speed)
  if (speed) result.speed = speed
  const gust = toWindSpeed(wind?.gust)
  if (gust) result.gust = gust
  const degrees = wind?.direction?.degrees
  if (
    degrees !== undefined &&
    Number.isInteger(degrees) &&
    degrees >= 0 &&
    degrees <= 360
  ) {
    result.directionDegrees = degrees
  }
  const cardinal = toConditionToken(wind?.direction?.cardinal)
  if (cardinal) result.directionCardinal = cardinal
  return Object.keys(result).length > 0 ? result : undefined
}

function assignCelestial(
  output: LookupWeatherOutput,
  response: ProviderLookupWeather,
): void {
  const sunriseTime = nonEmpty(response.sunEvents?.sunriseTime)
  const sunsetTime = nonEmpty(response.sunEvents?.sunsetTime)
  if (sunriseTime || sunsetTime) {
    const sun: NonNullable<LookupWeatherOutput['sun']> = {}
    if (sunriseTime) sun.sunriseTime = sunriseTime
    if (sunsetTime) sun.sunsetTime = sunsetTime
    output.sun = sun
  }
  const moonPhase = toConditionToken(response.moonEvents?.moonPhase)
  if (moonPhase) output.moonPhase = moonPhase
}

export function normalizeLookupWeatherResponse(
  response: ProviderLookupWeather,
): LookupWeatherOutput {
  const output: LookupWeatherOutput = {}
  const locationLabel = nonEmpty(response.returnedLocation?.address)
  if (locationLabel) {
    output.locationLabel = truncateText(
      locationLabel,
      MAPS_TEXT_LABEL_MAX_LENGTH,
    )
  }
  const condition = toCondition(response.weatherCondition)
  if (condition) output.condition = condition
  assignTemperatures(output, response)
  assignAtmosphere(output, response)
  const wind = toWind(response.wind)
  if (wind) output.wind = wind
  assignCelestial(output, response)
  const attribution = toAttribution(response.attribution)
  if (attribution) output.attribution = attribution
  return output
}

const RESOLVE_CONFIDENCE = new Map<string, 'high' | 'medium'>([
  ['HIGH', 'high'],
  ['MEDIUM', 'medium'],
])

export function normalizeResolveNamesResponse(
  response: ProviderResolveNames,
  queries: ResolvePlacesInput['queries'],
): ResolvePlacesOutput {
  const results: ResolvePlacesOutput['results'] = []

  for (const [index, query] of queries.entries()) {
    if (results.length === MAPS_RESOLVE_MAX_COUNT) break
    const resolved = response.results?.[index]
    const entry: ResolvePlacesOutput['results'][number] = { query: query.text }
    const placeId = toPlaceId(undefined, resolved?.entity?.place)
    if (placeId) entry.placeId = placeId
    const confidence = resolved?.confidence
      ? RESOLVE_CONFIDENCE.get(resolved.confidence)
      : undefined
    if (confidence) entry.confidence = confidence
    results.push(entry)
  }

  return { results }
}
