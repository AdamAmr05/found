import { z } from 'zod'

import { isHttpUrl } from './httpUrl'

export const MAPS_SUMMARY_MAX_LENGTH = 8_000
export const MAPS_PLACE_MAX_COUNT = 20
export const MAPS_ROUTE_MAX_COUNT = 3
export const MAPS_RESOLVE_MAX_COUNT = 20
export const MAPS_ATTRIBUTION_TITLE_MAX_LENGTH = 300
const MAPS_WARNING_MAX_LENGTH = 500
export const MAPS_CONDITION_TOKEN_MAX_LENGTH = 64
export const MAPS_TEXT_LABEL_MAX_LENGTH = 300

const httpUrl = z
  .string()
  .trim()
  .min(1)
  .max(2_048)
  .refine(isHttpUrl, { message: 'Expected an HTTP or HTTPS URL' })

const mapsCoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

const mapsAttributionSchema = z.object({
  title: z.string().trim().min(1).max(MAPS_ATTRIBUTION_TITLE_MAX_LENGTH),
  url: httpUrl,
})

const languageCodeSchema = z
  .string()
  .trim()
  .regex(/^[a-z]{2}(?:_[A-Z]{2})?$/, 'Expected a Maps language code')

const regionCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{2}$/, 'Expected a two-letter region code')
  .transform((value) => value.toUpperCase())

const placeIdSchema = z.string().trim().min(1).max(256)

const isoInstantSchema = z.string().trim().min(1).max(64)

export const searchPlacesInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2)
    .max(400)
    .describe(
      'A place, address, or nearby-place query with enough geographic context to be unambiguous.',
    ),
  locationBias: z
    .object({
      center: mapsCoordinatesSchema,
      radiusMeters: z.number().positive().max(50_000).optional(),
    })
    .optional()
    .describe('An optional preference for results near known coordinates.'),
  languageCode: languageCodeSchema.optional(),
  regionCode: regionCodeSchema.optional(),
})

const placeLinksSchema = z.object({
  place: httpUrl.optional(),
  directions: httpUrl.optional(),
  photos: httpUrl.optional(),
  reviews: httpUrl.optional(),
})

export const searchPlacesOutputSchema = z.object({
  summary: z.string().max(MAPS_SUMMARY_MAX_LENGTH),
  places: z
    .array(
      z.object({
        placeId: placeIdSchema,
        coordinates: mapsCoordinatesSchema.optional(),
        links: placeLinksSchema,
        attribution: mapsAttributionSchema,
      }),
    )
    .max(MAPS_PLACE_MAX_COUNT),
})

const mapsWaypointSchema = z.union([
  z.object({ address: z.string().trim().min(2).max(300) }).strict(),
  z.object({ coordinates: mapsCoordinatesSchema }).strict(),
  z.object({ placeId: placeIdSchema }).strict(),
])

export const computeRoutesInputSchema = z.object({
  origin: mapsWaypointSchema,
  destination: mapsWaypointSchema,
  travelMode: z.enum(['drive', 'walk']).default('drive'),
})

export const computeRoutesOutputSchema = z.object({
  routes: z
    .array(
      z.object({
        distanceMeters: z.number().int().nonnegative(),
        durationSeconds: z.number().nonnegative(),
        attribution: mapsAttributionSchema,
        warning: z
          .string()
          .trim()
          .min(1)
          .max(MAPS_WARNING_MAX_LENGTH)
          .optional(),
      }),
    )
    .max(MAPS_ROUTE_MAX_COUNT),
})

export const lookupWeatherInputSchema = z.object({
  location: mapsWaypointSchema,
  date: z
    .object({
      year: z.number().int().min(2_000).max(2_100),
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
    })
    .optional()
    .describe(
      "A calendar date in the location's local time zone. Omit for current conditions.",
    ),
  hour: z
    .number()
    .int()
    .min(0)
    .max(23)
    .optional()
    .describe("An hour of the day in the location's local time zone."),
  units: z.enum(['metric', 'imperial']).optional(),
})

const temperatureSchema = z.object({
  degrees: z.number(),
  unit: z.enum(['celsius', 'fahrenheit']),
})

const windSpeedSchema = z.object({
  value: z.number().nonnegative(),
  unit: z.enum(['kmh', 'mph']),
})

const percentSchema = z.number().int().min(0).max(100)

export const lookupWeatherOutputSchema = z.object({
  locationLabel: z
    .string()
    .trim()
    .min(1)
    .max(MAPS_TEXT_LABEL_MAX_LENGTH)
    .optional(),
  condition: z
    .object({
      token: z.string().trim().min(1).max(MAPS_CONDITION_TOKEN_MAX_LENGTH),
      description: z
        .string()
        .trim()
        .min(1)
        .max(MAPS_TEXT_LABEL_MAX_LENGTH)
        .optional(),
      iconBaseUri: httpUrl.optional(),
    })
    .optional(),
  temperature: temperatureSchema.optional(),
  feelsLike: temperatureSchema.optional(),
  minTemperature: temperatureSchema.optional(),
  maxTemperature: temperatureSchema.optional(),
  relativeHumidity: percentSchema.optional(),
  cloudCover: percentSchema.optional(),
  uvIndex: z.number().int().nonnegative().optional(),
  thunderstormProbability: percentSchema.optional(),
  precipitationProbability: z
    .object({
      percent: percentSchema,
      type: z
        .string()
        .trim()
        .min(1)
        .max(MAPS_CONDITION_TOKEN_MAX_LENGTH)
        .optional(),
    })
    .optional(),
  wind: z
    .object({
      speed: windSpeedSchema.optional(),
      gust: windSpeedSchema.optional(),
      directionDegrees: z.number().int().min(0).max(360).optional(),
      directionCardinal: z
        .string()
        .trim()
        .min(1)
        .max(MAPS_CONDITION_TOKEN_MAX_LENGTH)
        .optional(),
    })
    .optional(),
  sun: z
    .object({
      sunriseTime: isoInstantSchema.optional(),
      sunsetTime: isoInstantSchema.optional(),
    })
    .optional(),
  moonPhase: z
    .string()
    .trim()
    .min(1)
    .max(MAPS_CONDITION_TOKEN_MAX_LENGTH)
    .optional(),
  attribution: mapsAttributionSchema.optional(),
})

export const resolvePlacesInputSchema = z.object({
  queries: z
    .array(
      z.object({
        text: z
          .string()
          .trim()
          .min(2)
          .max(300)
          .describe('A specific place name or exact address to resolve.'),
      }),
    )
    .min(1)
    .max(MAPS_RESOLVE_MAX_COUNT),
  regionCode: regionCodeSchema.optional(),
})

export const resolvePlacesOutputSchema = z.object({
  results: z
    .array(
      z.object({
        query: z.string().trim().min(1).max(300),
        placeId: placeIdSchema.optional(),
        confidence: z.enum(['high', 'medium']).optional(),
      }),
    )
    .max(MAPS_RESOLVE_MAX_COUNT),
})

const MAP_SCENE_MARKER_MAX_COUNT = 20
const MAP_SCENE_PLACE_CARD_MAX_COUNT = 4
const MAP_SCENE_LABEL_MAX_LENGTH = 60
const MAP_SCENE_TITLE_MAX_LENGTH = 80

const mapPinSchema = z.object({
  label: z.string().trim().min(1).max(MAP_SCENE_LABEL_MAX_LENGTH),
  coordinates: mapsCoordinatesSchema,
  placeId: placeIdSchema.optional(),
  candidateRef: z
    .string()
    .trim()
    .min(1)
    .max(48)
    .optional()
    .describe(
      'The message-local candidate ref this marker represents, when it maps to a presented candidate.',
    ),
})

export const showMapInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2)
    .max(MAP_SCENE_TITLE_MAX_LENGTH)
    .describe('A short human label for what this scene shows.'),
  camera: z.object({
    center: mapsCoordinatesSchema,
    zoom: z.number().min(1).max(22),
    tilt: z.number().min(0).max(85).optional(),
    mode: z.enum(['roadmap', 'satellite']).optional(),
  }),
  markers: z.array(mapPinSchema).max(MAP_SCENE_MARKER_MAX_COUNT).default([]),
  route: z
    .object({
      origin: mapPinSchema,
      destination: mapPinSchema,
      travelMode: z.enum(['drive', 'walk']).default('drive'),
    })
    .optional(),
  placeCards: z
    .array(placeIdSchema)
    .max(MAP_SCENE_PLACE_CARD_MAX_COUNT)
    .optional()
    .describe(
      'Google place IDs worth inspecting closely, presented as rich place cards with the map.',
    ),
})

export const showMapOutputSchema = z.object({
  presented: z.literal(true),
})

export type MapsCoordinates = z.infer<typeof mapsCoordinatesSchema>
export type MapsAttribution = z.infer<typeof mapsAttributionSchema>
export type MapsWaypoint = z.infer<typeof mapsWaypointSchema>
export type SearchPlacesInput = z.infer<typeof searchPlacesInputSchema>
export type SearchPlacesOutput = z.infer<typeof searchPlacesOutputSchema>
export type ComputeRoutesInput = z.infer<typeof computeRoutesInputSchema>
export type ComputeRoutesOutput = z.infer<typeof computeRoutesOutputSchema>
export type LookupWeatherInput = z.infer<typeof lookupWeatherInputSchema>
export type LookupWeatherOutput = z.infer<typeof lookupWeatherOutputSchema>
export type ResolvePlacesInput = z.infer<typeof resolvePlacesInputSchema>
export type ResolvePlacesOutput = z.infer<typeof resolvePlacesOutputSchema>
export type ShowMapInput = z.infer<typeof showMapInputSchema>
type ShowMapOutput = z.infer<typeof showMapOutputSchema>

export type GoogleMapsUITools = {
  searchPlaces: { input: SearchPlacesInput; output: SearchPlacesOutput }
  computeRoutes: { input: ComputeRoutesInput; output: ComputeRoutesOutput }
  lookupWeather: { input: LookupWeatherInput; output: LookupWeatherOutput }
  resolvePlaces: { input: ResolvePlacesInput; output: ResolvePlacesOutput }
  showMap: { input: ShowMapInput; output: ShowMapOutput }
}
