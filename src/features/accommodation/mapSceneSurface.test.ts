import { describe, expect, it } from 'vitest'

import {
  MAP_SCENE_CATALOG_ID,
  buildPlaceCardsMessages,
} from './mapSceneSurface'

describe('Place card surface construction', () => {
  it('renders each requested place card with its literal place ID', () => {
    const messages = buildPlaceCardsMessages('scene-2', ['ChIJone', 'ChIJtwo'])

    expect(messages).toEqual([
      {
        version: 'v0.9',
        createSurface: {
          surfaceId: 'scene-2',
          catalogId: MAP_SCENE_CATALOG_ID,
        },
      },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'scene-2',
          components: [
            {
              id: 'root',
              component: 'Column',
              children: ['place-card-0', 'place-card-1'],
            },
            {
              id: 'place-card-0',
              component: 'PlaceDetailsCompact',
              placeId: 'ChIJone',
            },
            {
              id: 'place-card-1',
              component: 'PlaceDetailsCompact',
              placeId: 'ChIJtwo',
            },
          ],
        },
      },
    ])
  })
})
