export type AccommodationId = 'maybachufer' | 'helmholtzplatz'

export type AccommodationView = 'glance' | 'evidence' | 'decision'

export interface RequirementSignal {
  readonly label: string
  readonly value: string
  readonly status: 'match' | 'unconfirmed' | 'mismatch'
}

export interface EvidenceSource {
  readonly label: string
  readonly detail: string
  readonly status: 'verified' | 'conflict' | 'missing'
}

export interface Accommodation {
  readonly id: AccommodationId
  readonly name: string
  readonly area: string
  readonly city: string
  readonly description: string
  readonly price: number
  readonly totalMonthly: number
  readonly deposit: number
  readonly availableFrom: string
  readonly commuteMinutes: number
  readonly commuteLabel: string
  readonly imageUrls: readonly string[]
  readonly imageAlt: string
  readonly facts: readonly RequirementSignal[]
  readonly evidence: readonly EvidenceSource[]
  readonly sourceCount: number
  readonly lastChecked: string
  readonly mapPosition: {
    readonly x: number
    readonly y: number
  }
}

export const accommodations: readonly Accommodation[] = [
  {
    id: 'maybachufer',
    name: 'Canal-side Altbau',
    area: 'Maybachufer, Neukölln',
    city: 'Berlin',
    description:
      'A quiet furnished one-bedroom above the canal market, with an unusually complete paper trail.',
    price: 1180,
    totalMonthly: 1244,
    deposit: 2360,
    availableFrom: '1 September',
    commuteMinutes: 21,
    commuteLabel: 'to TU Berlin · U8 + U2',
    imageUrls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1400&q=88',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=88',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1400&q=88',
    ],
    imageAlt: 'Sunlit living room with timber floors and large windows',
    facts: [
      { label: 'Budget', value: '€70 under your ceiling', status: 'match' },
      {
        label: 'Registration',
        value: 'Anmeldung stated in listing',
        status: 'match',
      },
      { label: 'Lease', value: '6–12 months', status: 'match' },
      {
        label: 'Internet',
        value: 'Speed not published',
        status: 'unconfirmed',
      },
    ],
    evidence: [
      {
        label: 'Listing details',
        detail:
          'Price, availability, furniture and lease agree across 3 pages.',
        status: 'verified',
      },
      {
        label: 'Address',
        detail: 'Street is disclosed; exact house number is withheld.',
        status: 'missing',
      },
      {
        label: 'Registration',
        detail: 'Listing says yes; landlord confirmation still needed.',
        status: 'conflict',
      },
    ],
    sourceCount: 7,
    lastChecked: '4 minutes ago',
    mapPosition: { x: 44, y: 62 },
  },
  {
    id: 'helmholtzplatz',
    name: 'Courtyard studio',
    area: 'Helmholtzplatz, Prenzlauer Berg',
    city: 'Berlin',
    description:
      'A smaller, calmer studio with a direct tram connection and a higher all-in cost.',
    price: 1260,
    totalMonthly: 1328,
    deposit: 2520,
    availableFrom: '15 August',
    commuteMinutes: 27,
    commuteLabel: 'to TU Berlin · M10 + S-Bahn',
    imageUrls: [
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=88',
      'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1400&q=88',
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1400&q=88',
    ],
    imageAlt: 'Compact studio apartment with soft neutral furniture',
    facts: [
      {
        label: 'Budget',
        value: '€10 over before utilities',
        status: 'mismatch',
      },
      { label: 'Registration', value: 'Anmeldung confirmed', status: 'match' },
      { label: 'Lease', value: 'Minimum 9 months', status: 'unconfirmed' },
      { label: 'Internet', value: '250 Mbps included', status: 'match' },
    ],
    evidence: [
      {
        label: 'Listing details',
        detail: 'Amenities and availability agree across 4 pages.',
        status: 'verified',
      },
      {
        label: 'Total cost',
        detail: 'One source excludes the €68 utility estimate.',
        status: 'conflict',
      },
      {
        label: 'Landlord identity',
        detail: 'Company registration and imprint verified.',
        status: 'verified',
      },
    ],
    sourceCount: 9,
    lastChecked: '11 minutes ago',
    mapPosition: { x: 71, y: 30 },
  },
]

export function getAccommodation(id: AccommodationId): Accommodation {
  const accommodation = accommodations.find((candidate) => candidate.id === id)

  if (!accommodation) {
    throw new Error(`Missing accommodation fixture: ${id}`)
  }

  return accommodation
}
