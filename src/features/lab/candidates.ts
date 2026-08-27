/**
 * Lab fixtures. Richer than the thread prototype's fixtures because the
 * variants under study need contradiction, provenance, and cost structure to
 * have anything to animate. Mock data only: the identities, provider
 * boundaries, and claim states match the intended artifact so a real backend
 * can replace this module without redesigning the interactions.
 */

export type CandidateId =
  | 'boxhagener'
  | 'helmholtzplatz'
  | 'maybachufer'
  | 'rixdorf'
  | 'samariter'
  | 'urbanhafen'

/**
 * A source claim and a confirmed fact are different things. The ledger, the
 * peel, and the merge all depend on that distinction staying explicit.
 */
export type ClaimStatus = 'claimed' | 'confirmed' | 'contradicted' | 'unknown'

export interface Claim {
  readonly requirement: string
  readonly claimed: string
  readonly confirmed: string | null
  readonly status: ClaimStatus
  readonly provenance: string
  /** How long ago the source behind this status was read. Null when unsourced. */
  readonly verifiedMinutesAgo: number | null
}

export type CostConfidence = 'confirmed' | 'estimated' | 'missing'

export interface CostLine {
  readonly label: string
  readonly amount: number
  readonly confidence: CostConfidence
}

export interface Candidate {
  readonly id: CandidateId
  readonly name: string
  readonly area: string
  readonly city: string
  readonly headline: string
  readonly baseRent: number
  readonly allIn: number
  readonly deposit: number
  readonly costLines: readonly CostLine[]
  readonly availableFrom: string
  readonly commuteMinutes: number
  readonly commuteLabel: string
  readonly imageUrl: string
  readonly imageAlt: string
  readonly claims: readonly Claim[]
  readonly sourceCount: number
  readonly checkedMinutesAgo: number
  readonly strongestMatch: string
  readonly openQuestion: string
}

/** The requirement the user gave the agent, in euros, all in. */
export const budgetCeiling = 1250

const photo = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=85`

export const candidates: readonly Candidate[] = [
  {
    id: 'maybachufer',
    name: 'Canal-side Altbau',
    area: 'Maybachufer, Neukölln',
    city: 'Berlin',
    headline: 'Furnished one-bedroom above the canal market.',
    baseRent: 1180,
    allIn: 1244,
    deposit: 2360,
    costLines: [
      { label: 'Base rent', amount: 1180, confidence: 'confirmed' },
      { label: 'Nebenkosten', amount: 52, confidence: 'confirmed' },
      { label: 'Internet', amount: 12, confidence: 'estimated' },
    ],
    availableFrom: '1 September',
    commuteMinutes: 21,
    commuteLabel: 'TU Berlin · U8 + U2',
    imageUrl: photo('photo-1502672260266-1c1ef2d93688'),
    imageAlt: 'Sunlit living room with timber floors and tall windows',
    claims: [
      {
        requirement: 'All-in budget',
        claimed: '€1,180 cold',
        confirmed: '€1,244 warm',
        status: 'confirmed',
        provenance: 'Operator PDF · 3 pages agree',
        verifiedMinutesAgo: 12,
      },
      {
        requirement: 'Anmeldung',
        claimed: 'Registration possible',
        confirmed: null,
        status: 'claimed',
        provenance: 'Listing body text only',
        verifiedMinutesAgo: 4,
      },
      {
        requirement: 'Minimum lease',
        claimed: '6 months',
        confirmed: '6 months',
        status: 'confirmed',
        provenance: 'Contract excerpt · 12 Aug',
        verifiedMinutesAgo: 1040,
      },
      {
        requirement: 'Internet speed',
        claimed: 'Not stated',
        confirmed: null,
        status: 'unknown',
        provenance: 'No source found',
        verifiedMinutesAgo: null,
      },
    ],
    sourceCount: 7,
    checkedMinutesAgo: 4,

    strongestMatch: '€6 under your ceiling, all in',
    openQuestion: 'Registration is claimed but never confirmed.',
  },
  {
    id: 'helmholtzplatz',
    name: 'Courtyard studio',
    area: 'Helmholtzplatz, Prenzlauer Berg',
    city: 'Berlin',
    headline: 'Quiet rear-building studio with a tram at the door.',
    baseRent: 1260,
    allIn: 1328,
    deposit: 2520,
    costLines: [
      { label: 'Base rent', amount: 1260, confidence: 'confirmed' },
      { label: 'Nebenkosten', amount: 68, confidence: 'estimated' },
    ],
    availableFrom: '15 August',
    commuteMinutes: 27,
    commuteLabel: 'TU Berlin · M10 + S-Bahn',
    imageUrl: photo('photo-1493809842364-78817add7ffb'),
    imageAlt: 'Compact studio apartment with soft neutral furniture',
    claims: [
      {
        requirement: 'All-in budget',
        claimed: '€1,260 cold',
        confirmed: null,
        status: 'contradicted',
        provenance: 'Portal omits the €68 estimate',
        verifiedMinutesAgo: 2600,
      },
      {
        requirement: 'Anmeldung',
        claimed: 'Registration confirmed',
        confirmed: 'Registration confirmed',
        status: 'confirmed',
        provenance: 'Operator imprint · 9 Aug',
        verifiedMinutesAgo: 1800,
      },
      {
        requirement: 'Minimum lease',
        claimed: '9 months',
        confirmed: null,
        status: 'claimed',
        provenance: 'Listing summary',
        verifiedMinutesAgo: 11,
      },
      {
        requirement: 'Internet speed',
        claimed: '250 Mbps included',
        confirmed: '250 Mbps included',
        status: 'confirmed',
        provenance: 'Provider coverage check',
        verifiedMinutesAgo: 340,
      },
    ],
    sourceCount: 9,
    checkedMinutesAgo: 11,

    strongestMatch: 'Registration confirmed by the operator',
    openQuestion: '€78 over your ceiling once utilities are counted.',
  },
  {
    id: 'boxhagener',
    name: 'Market-square rooms',
    area: 'Boxhagener Platz, Friedrichshain',
    city: 'Berlin',
    headline: 'Two rooms over the Saturday market, recently repainted.',
    baseRent: 1090,
    allIn: 1198,
    deposit: 2180,
    costLines: [
      { label: 'Base rent', amount: 1090, confidence: 'confirmed' },
      { label: 'Nebenkosten', amount: 84, confidence: 'confirmed' },
      { label: 'Heating', amount: 24, confidence: 'estimated' },
    ],
    availableFrom: '1 October',
    commuteMinutes: 33,
    commuteLabel: 'TU Berlin · U5 + U2',
    imageUrl: photo('photo-1522708323590-d24dbb6b0267'),
    imageAlt: 'Bright apartment corner with a green plant and pale walls',
    claims: [
      {
        requirement: 'All-in budget',
        claimed: '€1,090 cold',
        confirmed: '€1,198 warm',
        status: 'confirmed',
        provenance: 'Two operator pages agree',
        verifiedMinutesAgo: 26,
      },
      {
        requirement: 'Anmeldung',
        claimed: 'Not mentioned',
        confirmed: null,
        status: 'unknown',
        provenance: 'No source found',
        verifiedMinutesAgo: 26,
      },
      {
        requirement: 'Minimum lease',
        claimed: '12 months',
        confirmed: '12 months',
        status: 'confirmed',
        provenance: 'Contract excerpt · 6 Aug',
        verifiedMinutesAgo: 3100,
      },
      {
        requirement: 'Internet speed',
        claimed: '100 Mbps',
        confirmed: null,
        status: 'claimed',
        provenance: 'Listing amenity list',
        verifiedMinutesAgo: 700,
      },
    ],
    sourceCount: 5,
    checkedMinutesAgo: 26,

    strongestMatch: '€52 under your ceiling, all in',
    openQuestion: 'Commute is 12 minutes longer than the others.',
  },
  {
    id: 'rixdorf',
    name: 'Old-village annexe',
    area: 'Rixdorf, Neukölln',
    city: 'Berlin',
    headline: 'A converted side wing on a cobbled square.',
    baseRent: 1145,
    allIn: 1219,
    deposit: 1145,
    costLines: [
      { label: 'Base rent', amount: 1145, confidence: 'confirmed' },
      { label: 'Nebenkosten', amount: 74, confidence: 'missing' },
    ],
    availableFrom: '20 September',
    commuteMinutes: 29,
    commuteLabel: 'TU Berlin · U7 + U2',
    imageUrl: photo('photo-1560448204-e02f11c3d0e2'),
    imageAlt: 'Living room with a low sofa and warm afternoon light',
    claims: [
      {
        requirement: 'All-in budget',
        claimed: '€1,145 cold',
        confirmed: null,
        status: 'claimed',
        provenance: 'Utilities never itemised',
        verifiedMinutesAgo: 4200,
      },
      {
        requirement: 'Anmeldung',
        claimed: 'Registration possible',
        confirmed: 'Registration possible',
        status: 'confirmed',
        provenance: 'Landlord email · 14 Aug',
        verifiedMinutesAgo: 2,
      },
      {
        requirement: 'Minimum lease',
        claimed: '3 months',
        confirmed: '3 months',
        status: 'confirmed',
        provenance: 'Contract excerpt · 14 Aug',
        verifiedMinutesAgo: 2,
      },
      {
        requirement: 'Internet speed',
        claimed: 'Tenant arranges',
        confirmed: 'Tenant arranges',
        status: 'confirmed',
        provenance: 'Landlord email · 14 Aug',
        verifiedMinutesAgo: 2,
      },
    ],
    sourceCount: 6,
    checkedMinutesAgo: 2,

    strongestMatch: 'One month deposit instead of two',
    openQuestion: 'Nobody has itemised the utilities.',
  },
  {
    id: 'urbanhafen',
    name: 'Harbour-front flat',
    area: 'Urbanhafen, Kreuzberg',
    city: 'Berlin',
    headline: 'South-facing, water on one side and a park on the other.',
    baseRent: 1310,
    allIn: 1382,
    deposit: 3930,
    costLines: [
      { label: 'Base rent', amount: 1310, confidence: 'confirmed' },
      { label: 'Nebenkosten', amount: 72, confidence: 'confirmed' },
    ],
    availableFrom: '1 September',
    commuteMinutes: 18,
    commuteLabel: 'TU Berlin · U1 + U2',
    imageUrl: photo('photo-1560185127-6ed189bf02f4'),
    imageAlt: 'Open-plan room with a large window facing water',
    claims: [
      {
        requirement: 'All-in budget',
        claimed: '€1,310 cold',
        confirmed: '€1,382 warm',
        status: 'contradicted',
        provenance: 'Confirmed, and over your ceiling',
        verifiedMinutesAgo: 7,
      },
      {
        requirement: 'Anmeldung',
        claimed: 'Registration confirmed',
        confirmed: 'Registration confirmed',
        status: 'confirmed',
        provenance: 'Operator imprint · 21 Aug',
        verifiedMinutesAgo: 900,
      },
      {
        requirement: 'Minimum lease',
        claimed: '12 months',
        confirmed: '12 months',
        status: 'confirmed',
        provenance: 'Contract excerpt · 21 Aug',
        verifiedMinutesAgo: 900,
      },
      {
        requirement: 'Internet speed',
        claimed: '1 Gbps fibre',
        confirmed: '1 Gbps fibre',
        status: 'confirmed',
        provenance: 'Provider coverage check',
        verifiedMinutesAgo: 260,
      },
    ],
    sourceCount: 11,
    checkedMinutesAgo: 7,

    strongestMatch: 'Fastest commute and everything verified',
    openQuestion: '€132 over your ceiling, and three months deposit.',
  },
  {
    id: 'samariter',
    name: 'Quiet Seitenflügel',
    area: 'Samariterviertel, Friedrichshain',
    city: 'Berlin',
    headline: 'Small, cheap, and the sources disagree about almost everything.',
    baseRent: 995,
    allIn: 1071,
    deposit: 1990,
    costLines: [
      { label: 'Base rent', amount: 995, confidence: 'confirmed' },
      { label: 'Nebenkosten', amount: 76, confidence: 'estimated' },
    ],
    availableFrom: 'Immediately',
    commuteMinutes: 31,
    commuteLabel: 'TU Berlin · U5 + U2',
    imageUrl: photo('photo-1484154218962-a197022b5858'),
    imageAlt: 'Simple kitchen with pale cabinets and a small table',
    claims: [
      {
        requirement: 'All-in budget',
        claimed: '€995 cold',
        confirmed: '€1,071 warm',
        status: 'confirmed',
        provenance: 'Operator page · 24 Aug',
        verifiedMinutesAgo: 19,
      },
      {
        requirement: 'Anmeldung',
        claimed: 'Registration possible',
        confirmed: null,
        status: 'contradicted',
        provenance: 'A second listing says no',
        verifiedMinutesAgo: 2900,
      },
      {
        requirement: 'Minimum lease',
        claimed: '6 months',
        confirmed: null,
        status: 'contradicted',
        provenance: 'Portal says 12, operator says 6',
        verifiedMinutesAgo: 4400,
      },
      {
        requirement: 'Internet speed',
        claimed: 'Not stated',
        confirmed: null,
        status: 'unknown',
        provenance: 'No source found',
        verifiedMinutesAgo: null,
      },
    ],
    sourceCount: 8,
    checkedMinutesAgo: 19,

    strongestMatch: '€179 under your ceiling, all in',
    openQuestion: 'Two sources contradict each other on registration.',
  },
]

export function getCandidate(id: CandidateId): Candidate {
  const candidate = candidates.find((entry) => entry.id === id)

  if (!candidate) {
    throw new Error(`Missing lab fixture: ${id}`)
  }

  return candidate
}

export interface ClaimTally {
  readonly confirmed: number
  readonly claimed: number
  readonly contradicted: number
  readonly unknown: number
  readonly total: number
}

export function tallyClaims(candidate: Candidate): ClaimTally {
  const count = (status: ClaimStatus) =>
    candidate.claims.filter((claim) => claim.status === status).length

  return {
    confirmed: count('confirmed'),
    claimed: count('claimed'),
    contradicted: count('contradicted'),
    unknown: count('unknown'),
    total: candidate.claims.length,
  }
}

/**
 * Evidence has an age, and the product says so in one voice. Minutes are the
 * stored value because they can be compared; the sentence is derived.
 */
export function relativeTime(minutes: number): string {
  if (minutes < 2) return 'a moment ago'
  if (minutes < 60) return `${minutes} minutes ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`

  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

/** Euro formatting is a product decision, not a per-component one. */
export function euros(amount: number): string {
  return `€${amount.toLocaleString('en-US')}`
}
