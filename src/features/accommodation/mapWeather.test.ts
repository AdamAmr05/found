import { describe, expect, it } from 'vitest'

import { sunGlanceLabel, weatherGlance } from './mapWeather'

const NOW = Date.parse('2026-08-29T15:00:00Z')

describe('weather glance', () => {
  it('projects temperature, condition, icon, and the next sun event', () => {
    const glance = weatherGlance(
      {
        condition: {
          token: 'partly_cloudy',
          description: 'Partly cloudy',
          iconBaseUri: 'https://maps.gstatic.com/weather/v1/partly_cloudy',
        },
        temperature: { degrees: 21.6, unit: 'celsius' },
        sun: {
          sunriseTime: '2026-08-29T04:21:00Z',
          sunsetTime: '2026-08-29T18:04:00Z',
        },
      },
      NOW,
    )

    expect(glance).toEqual({
      temperatureLabel: '22°C',
      conditionLabel: 'Partly cloudy',
      iconUrl: 'https://maps.gstatic.com/weather/v1/partly_cloudy.svg',
      sunLabel: 'Sunset in 3 h 4 min',
    })
  })

  it('falls back to the next sunrise after dark and stays quiet without data', () => {
    expect(
      sunGlanceLabel(
        {
          sunriseTime: '2026-08-30T04:22:00Z',
          sunsetTime: '2026-08-29T18:04:00Z',
        },
        Date.parse('2026-08-29T20:00:00Z'),
      ),
    ).toBe('Sunrise in 8 h 22 min')
    expect(sunGlanceLabel(undefined, NOW)).toBeUndefined()
    expect(weatherGlance(undefined, NOW)).toBeUndefined()
    expect(weatherGlance({}, NOW)).toBeUndefined()
  })
})
