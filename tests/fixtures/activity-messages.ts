import type { FoundUIMessage } from '../../src/features/thread/ThreadMessage'
import type { ActivityPart } from '../../src/features/thread/activityModel'

export function message(
  key: string,
  role: FoundUIMessage['role'],
  parts: FoundUIMessage['parts'],
  status: FoundUIMessage['status'] = 'success',
): FoundUIMessage {
  return {
    id: key,
    key,
    role,
    parts,
    status,
    order: 0,
    stepOrder: 0,
    text: '',
    _creationTime: 1,
  }
}

export const searches: ActivityPart[] = Array.from(
  { length: 4 },
  (_, index) => ({
    type: 'tool-searchWeb',
    toolCallId: `search-${index}`,
    state: 'output-available',
    input: { query: `Ulm furnished room ${index}` },
    output: { results: [] },
  }),
)

export const reads: ActivityPart[] = Array.from({ length: 4 }, (_, index) => ({
  type: 'tool-readPage',
  toolCallId: `read-${index}`,
  state: 'input-available',
  input: { url: `https://example.com/room/${index}` },
}))

export const completedReads: ActivityPart[] = reads.map((part) => ({
  type: 'tool-readPage',
  toolCallId: part.toolCallId,
  state: 'output-available',
  input: { url: 'https://example.com/room' },
  output: {
    url: 'https://example.com/room',
    mode: 'full',
    content: 'Furnished room in Ulm.',
    images: [],
    truncated: false,
  },
}))

// These values are type-correct historical parts but fail the runtime validators.
export const brokenEmbeds: ActivityPart[] = [
  {
    type: 'tool-showCandidates',
    toolCallId: 'candidates',
    state: 'output-available',
    input: { candidates: [] },
    output: { presented: 1 },
  },
  {
    type: 'tool-showMap',
    toolCallId: 'map',
    state: 'output-available',
    input: {
      title: '',
      camera: { center: { latitude: 48.4, longitude: 10 }, zoom: 12 },
      markers: [],
    },
    output: { presented: true },
  },
]

export const prompt = message('user-1', 'user', [
  { type: 'text', text: 'Find me a furnished room in Ulm under €450 a month.' },
])

export const places: ActivityPart = {
  type: 'tool-searchPlaces',
  toolCallId: 'places',
  state: 'output-available',
  input: { query: 'Ulm University' },
  output: {
    summary: 'University nearby',
    places: [
      {
        placeId: 'university',
        links: {},
        attribution: {
          title: 'Ulm University — Google Maps',
          url: 'https://maps.google.com/?q=Ulm+University',
        },
      },
    ],
  },
}

export const reply = {
  type: 'text',
  text: 'I found a furnished room close to the university. The rent is within your budget; availability still needs confirming.',
} as const
