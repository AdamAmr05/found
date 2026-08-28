# Implementation contracts

This document starts with the contracts that are settled enough to implement.
It does not define the application database schema.

## Candidate presentation

`showCandidates` is the agent's only candidate-presentation tool. It turns an
agent-authored snapshot into the existing Card or Fold interface. The contract
controls the shape and size of that interface without deciding what the agent
should conclude from its research.

```ts
type ShowCandidatesInput = {
  candidates: readonly CandidateSnapshot[]
}

type CandidateSnapshot = {
  ref: string
  title: string
  location: {
    label: string
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  price?: {
    amount: number
    currency: string
    period: 'night' | 'week' | 'month' | 'stay'
    basis: 'all_in' | 'base'
    confidence: 'stated' | 'derived' | 'estimated'
  }
  images: readonly {
    url: string
    alt: string
    sourceRef?: string
  }[]
  sources: readonly {
    ref: string
    url: string
    label: string
  }[]
  contact?: {
    name?: string
    email?: string
    url?: string
  }
  atAGlance: {
    summary: string
    facts: readonly {
      label: string
      value: string
      signal?: 'positive' | 'neutral' | 'caution' | 'negative'
    }[]
  }
  evidence: readonly {
    claim: string
    finding: string
    status: 'supported' | 'claimed' | 'contradicted' | 'unresolved'
    sourceRefs: readonly string[]
  }[]
  nextMove: {
    summary: string
  }
}
```

The runtime validator will own the implemented type. This TypeScript shape
records the interface before that validator exists.

### Meaning

- `ref` is unique only within one tool output. It connects the candidate's
  Card, Fold row, media, and map focus without pretending to be a global
  accommodation ID.
- `title`, `location`, `price`, and `images` form the stable card envelope.
- `At a glance` contains one concise summary and the facts that matter for this
  user and this search.
- `Evidence` keeps the agent's claim, finding, status, and supporting source
  references together. A source list without claim-level grounding is not
  enough.
- `Next move` explains what deserves attention or what the user could do next.
  It does not decide for the user. Unanswered questions remain unresolved
  evidence rather than becoming a second evidence list here.
- `contact` records an available route to the counterparty. Its presence does
  not authorize outreach.

### Presentation bounds

These are interface bounds, not research rules:

- one `showCandidates` call contains 1–12 candidates;
- one candidate contains up to 6 images and 12 sources;
- `At a glance` contains up to 6 facts;
- `Evidence` contains up to 8 findings;
- summaries are short card copy, not report bodies;
- labels and values fit their existing Card and Fold rows without truncating
  the meaning.

The implemented validator will use concrete string bounds after the actual
components are measured with representative content.

### Validation

The tool rejects malformed output. It does not repair or reinterpret the
agent's conclusions.

- candidate refs are unique within the call;
- source refs are unique within a candidate;
- every image and evidence source ref resolves inside that candidate;
- URLs are valid HTTP or HTTPS URLs;
- coordinates, amounts, and array sizes stay within their bounds;
- unknown information is absent or marked `unresolved`, never invented;
- the payload contains no component names, layout flags, CSS, or executable UI.

### Message and rendering behavior

The validated tool output is stored as a historical tool part in the assistant
message. `showCandidates` does not create or update an application candidate
row.

- 1–2 candidates render as Cards;
- 3–12 candidates render as Fold;
- the same tool part never changes after the turn;
- a later turn may contain another `showCandidates` part;
- Merge begins from an explicit user comparison action and is not a
  `showCandidates` layout option;
- map focus uses the message-local candidate ref when a spatial part appears in
  the same response.

Saving, bookmarking, comparing, and contacting a candidate are separate user
actions with their own durability contracts. They do not mutate the historical
tool part.
