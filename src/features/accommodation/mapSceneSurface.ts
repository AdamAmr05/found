export const MAP_SCENE_CATALOG_ID = 'a2ui://maps-agentic-ui-catalog.json'

type ColumnComponent = {
  id: string
  component: 'Column'
  children: string[]
}

type PlaceCardComponent = {
  id: string
  component: 'PlaceDetailsCompact'
  placeId: string
}

type MapSceneComponent = ColumnComponent | PlaceCardComponent

export type MapSceneMessage =
  | {
      version: 'v0.9'
      createSurface: { surfaceId: string; catalogId: string }
    }
  | {
      version: 'v0.9'
      updateComponents: { surfaceId: string; components: MapSceneComponent[] }
    }

export function buildPlaceCardsMessages(
  surfaceId: string,
  placeIds: readonly string[],
): MapSceneMessage[] {
  const cardIds = placeIds.map((_, index) => `place-card-${index}`)
  const components: MapSceneComponent[] = [
    { id: 'root', component: 'Column', children: cardIds },
    ...placeIds.map((placeId, index): PlaceCardComponent => ({
      id: `place-card-${index}`,
      component: 'PlaceDetailsCompact',
      placeId,
    })),
  ]

  return [
    {
      version: 'v0.9',
      createSurface: { surfaceId, catalogId: MAP_SCENE_CATALOG_ID },
    },
    {
      version: 'v0.9',
      updateComponents: { surfaceId, components },
    },
  ]
}
