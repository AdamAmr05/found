import type { SearchPlacesOutput } from '../../../shared/googleMaps'
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
    active: 'Grounding places on Google Maps',
    error: 'Maps place search failed',
    success: 'Grounded places on Google Maps',
  },
  'tool-computeRoutes': {
    active: 'Measuring the real journey',
    error: 'Couldn’t measure the journey',
    success: 'Measured the real journey',
  },
  'tool-lookupWeather': {
    active: 'Checking the weather there',
    error: 'Couldn’t check the weather',
    success: 'Checked the weather there',
  },
  'tool-resolvePlaces': {
    active: 'Anchoring places on Google Maps',
    error: 'Couldn’t anchor the places',
    success: 'Anchored places on Google Maps',
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
    </div>
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
          <a
            className="inline-block max-w-240 truncate rounded-full border-1 border-border-faint px-10 py-2 text-label-x-small text-foreground-muted transition-colors duration-4 hover:border-border-muted hover:text-accent-black"
            href={place.links.place ?? place.attribution.url}
            rel="noreferrer"
            target="_blank"
          >
            {place.attribution.title}
          </a>
        </li>
      ))}
    </ul>
  )
}
