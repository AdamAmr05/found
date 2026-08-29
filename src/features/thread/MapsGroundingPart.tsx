import type {
  ComputeRoutesOutput,
  LookupWeatherOutput,
  MapsAttribution,
  SearchPlacesOutput,
} from '../../../shared/googleMaps'
import type { FoundUIMessage } from './ThreadMessage'
import { ToolStep } from './ThreadToolStep'
import { isToolActive } from './toolState'

type GroundingPart = Extract<
  FoundUIMessage['parts'][number],
  {
    type:
      | 'tool-searchPlaces'
      | 'tool-computeRoutes'
      | 'tool-lookupWeather'
      | 'tool-resolvePlaces'
  }
>

const GROUNDING_LABELS = {
  'tool-searchPlaces': {
    active: 'Finding nearby places',
    error: 'Couldn’t search nearby places',
    success: 'Found nearby places',
  },
  'tool-computeRoutes': {
    active: 'Measuring the journey',
    error: 'Couldn’t measure the journey',
    success: 'Measured the journey',
  },
  'tool-lookupWeather': {
    active: 'Checking the weather there',
    error: 'Couldn’t check the weather',
    success: 'Checked the weather there',
  },
  'tool-resolvePlaces': {
    active: 'Locating the addresses',
    error: 'Couldn’t locate the addresses',
    success: 'Located the addresses',
  },
} satisfies Record<
  GroundingPart['type'],
  { active: string; error: string; success: string }
>

const SOURCE_LINK_MAX_COUNT = 4

export function MapsGroundingPart({ part }: { readonly part: GroundingPart }) {
  const active = isToolActive(part.state)
  const error = part.state === 'output-error' || part.state === 'output-denied'
  const labels = GROUNDING_LABELS[part.type]
  const label = active ? labels.active : error ? labels.error : labels.success

  return (
    <div className="flex flex-col gap-6">
      <ToolStep active={active} error={error} label={label} />
      {part.type === 'tool-searchPlaces' &&
      part.state === 'output-available' ? (
        <MapsSourceLinks places={part.output.places} />
      ) : null}
      {part.type === 'tool-computeRoutes' &&
      part.state === 'output-available' ? (
        <RouteOutcome routes={part.output.routes} />
      ) : null}
      {part.type === 'tool-lookupWeather' &&
      part.state === 'output-available' ? (
        <WeatherSource attribution={part.output.attribution} />
      ) : null}
    </div>
  )
}

function AttributionChip({
  attribution,
}: {
  readonly attribution: MapsAttribution
}) {
  return (
    <a
      className="inline-block max-w-240 truncate rounded-full border-1 border-border-faint px-10 py-2 text-label-x-small text-foreground-muted transition-colors duration-4 hover:border-border-muted hover:text-accent-black"
      href={attribution.url}
      rel="noreferrer"
      target="_blank"
    >
      {attribution.title}
    </a>
  )
}

function MapsSourceLinks({
  places,
}: {
  readonly places: SearchPlacesOutput['places']
}) {
  const sources = places.slice(0, SOURCE_LINK_MAX_COUNT)
  if (sources.length === 0) return null

  return (
    <ul className="flex flex-wrap gap-6 pl-28">
      {sources.map((place) => (
        <li className="min-w-0" key={place.placeId}>
          <AttributionChip
            attribution={{
              title: place.attribution.title,
              url: place.links.place ?? place.attribution.url,
            }}
          />
        </li>
      ))}
    </ul>
  )
}

function RouteOutcome({
  routes,
}: {
  readonly routes: ComputeRoutesOutput['routes']
}) {
  const warning = routes.find((route) => route.warning)?.warning
  if (routes.length === 0 && !warning) return null

  return (
    <div className="flex flex-col gap-4 pl-28">
      {routes.length > 0 ? (
        <ul className="flex flex-wrap gap-6">
          {routes.slice(0, SOURCE_LINK_MAX_COUNT).map((route) => (
            <li className="min-w-0" key={route.attribution.url}>
              <AttributionChip attribution={route.attribution} />
            </li>
          ))}
        </ul>
      ) : null}
      {warning ? (
        <p className="text-label-x-small text-foreground-muted">{warning}</p>
      ) : null}
    </div>
  )
}

function WeatherSource({
  attribution,
}: {
  readonly attribution: LookupWeatherOutput['attribution']
}) {
  if (!attribution) return null
  return (
    <div className="pl-28">
      <AttributionChip attribution={attribution} />
    </div>
  )
}
