import type { LookupWeatherOutput } from '../../../shared/googleMaps'

export type WeatherGlance = {
  temperatureLabel?: string
  conditionLabel?: string
  iconUrl?: string
  sunLabel?: string
  attribution?: { title: string; url: string }
}

function formatTemperature(
  temperature: LookupWeatherOutput['temperature'],
): string | undefined {
  if (!temperature) return undefined
  const unit = temperature.unit === 'fahrenheit' ? '°F' : '°C'
  return `${Math.round(temperature.degrees)}${unit}`
}

function parseInstant(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

function formatDelta(deltaMs: number): string {
  const totalMinutes = Math.round(deltaMs / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${Math.max(minutes, 1)} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

// Sun events arrive as instants without the location's time zone, so the
// glance describes them as time-from-now instead of clock times.
export function sunGlanceLabel(
  sun: LookupWeatherOutput['sun'],
  nowMs: number,
): string | undefined {
  const sunrise = parseInstant(sun?.sunriseTime)
  const sunset = parseInstant(sun?.sunsetTime)
  const dayMs = 24 * 60 * 60 * 1000

  const upcoming: { label: string; at: number }[] = []
  if (sunset !== undefined && sunset > nowMs && sunset - nowMs < dayMs) {
    upcoming.push({ label: 'Sunset', at: sunset })
  }
  if (sunrise !== undefined && sunrise > nowMs && sunrise - nowMs < dayMs) {
    upcoming.push({ label: 'Sunrise', at: sunrise })
  }
  upcoming.sort((a, b) => a.at - b.at)
  const next = upcoming[0]
  if (!next) return undefined
  return `${next.label} in ${formatDelta(next.at - nowMs)}`
}

export function weatherGlance(
  weather: LookupWeatherOutput | undefined,
  nowMs: number,
): WeatherGlance | undefined {
  if (!weather) return undefined
  const glance: WeatherGlance = {}
  const temperatureLabel = formatTemperature(weather.temperature)
  if (temperatureLabel) glance.temperatureLabel = temperatureLabel
  if (weather.condition?.description) {
    glance.conditionLabel = weather.condition.description
  }
  if (weather.condition?.iconBaseUri) {
    glance.iconUrl = `${weather.condition.iconBaseUri}.svg`
  }
  const sunLabel = sunGlanceLabel(weather.sun, nowMs)
  if (sunLabel) glance.sunLabel = sunLabel
  if (weather.attribution) glance.attribution = weather.attribution
  return Object.keys(glance).length > 0 ? glance : undefined
}
