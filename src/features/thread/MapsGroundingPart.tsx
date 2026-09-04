import type {
  ComputeRoutesOutput,
  LookupWeatherOutput,
  MapsAttribution,
  SearchPlacesOutput,
} from '../../../shared/googleMaps'
import type { FoundUIMessage } from './ThreadMessage'

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

const SOURCE_LINK_MAX_COUNT = 4

export function MapsGroundingSources({
  part,
}: {
  readonly part: GroundingPart
}) {
  if (part.state !== 'output-available') return null
  switch (part.type) {
    case 'tool-searchPlaces':
      return <MapsSourceLinks places={part.output.places} />
    case 'tool-computeRoutes':
      return <RouteOutcome routes={part.output.routes} />
    case 'tool-lookupWeather':
      return <WeatherSource attribution={part.output.attribution} />
    case 'tool-resolvePlaces':
      return null
  }
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
    <ul className="flex flex-wrap gap-6">
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
    <div className="flex flex-col gap-4">
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
    <div className="flex">
      <AttributionChip attribution={attribution} />
    </div>
  )
}
