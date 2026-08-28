# Implementation contracts

This document starts with the contracts that are settled enough to implement.
It does not define the application database schema.

## Agent and message boundary

Found uses AI SDK 7 with the Convex Agent component. `ai` is a direct
dependency even when the Agent component already brings it in transitively.
The application should not inherit a different AI SDK version by accident.

One Agent component thread backs one Found workspace. The component owns the
stored messages, tool calls, tool results, model metadata, and stream deltas.
Found does not recreate those tables or maintain a second message history.

Until Convex Auth v2 is connected, an unguessable browser session ID acts as a
temporary bearer credential for thread ownership. Every public thread read and
write verifies that ownership. This is a development bridge, not the final
identity model, and it must be replaced rather than layered beside auth.

An agent run uses the Agent component's AI SDK integration:

- tools are defined with the installed `createTool` API and keep their inferred
  input and output types;
- the thread runs `streamText` with persisted deltas;
- the tool set stays stable for the duration of the run;
- a bounded step count protects cost and execution time without defining a
  product workflow;
- the client reads completed messages with `listUIMessages` and live deltas
  with `syncStreams` through `useUIMessages`;
- tool states are translated into concise steps at the UI boundary. Provider
  names, raw arguments, and raw results are not user-facing progress copy.

The message query authorizes thread access, applies bounded pagination, calls
`listUIMessages` and `syncStreams`, and returns their result. It does not
sanitize the full message history, rebuild every tool part, or parse the same
stream repeatedly on each reactive update.

The Agent component's UI message representation is component-owned. Its
current public API does not include one complete Convex return validator for
`listUIMessages` plus streams. Found will not maintain a parallel copy of that
large message union. Found-owned tool payloads are validated when they are
created, and the renderer narrows only the tool part it handles. Client message
types are derived from the generated query return rather than handwritten.

## OpenAI provider

Found calls OpenAI directly through the official AI SDK provider. The OpenAI
API key exists only in the Convex deployment environment. It is never accepted
from the client, stored in application tables, or returned from a function.

Model selection is server-owned. The client cannot supply a model ID. The
initial model identifier is explicit in the agent module and changes
deliberately after evaluating tool calling, `showCandidates` schema adherence,
latency, and cost. There is no silent provider or model fallback.

The Convex Agent component remains responsible for thread messages, model
metadata, and persisted stream deltas. Calling OpenAI directly changes the
model transport, not the message or streaming architecture.

## Tool type ownership

An agent tool is an API. Its name, description, input, output, and failure
shape should remain small enough to understand together.

- Define each tool directly with `createTool`. Do not route known schemas
  through a generic factory that widens them to `unknown`.
- Zod 4 owns model-facing tool schemas because AI SDK consumes those schemas
  directly. TypeScript types are inferred from the schemas.
- Convex `v` validators own registered Convex function arguments, return
  values, persisted product records, and generated data-model types.
- A shape that crosses both boundaries is derived or adapted deliberately. It
  is not copied into two independently maintained contracts.
- A provider response may be untyped only inside its adapter. The adapter
  validates it once and returns a narrow Found-owned result or a typed failure.
- Research tools return compact source material. Presentation tools retain the
  complete validated output required by their renderer.

Effect is not required around the Agent loop or every Firecrawl call. The
Firecrawl component already retries transient failures and returns structured
`ConvexError` data. Effect belongs here only if composition, cancellation,
additional timeout policy, concurrency, or a reusable typed service boundary
earns it.

## Firecrawl research tools

The Firecrawl Convex component is the execution path. Its client provides
`search`, `scrape`, `map`, and durable crawl operations, but it does not provide
AI SDK tools. Its one-shot results deliberately pass through the current
Firecrawl response, so Found validates them before returning them to the
agent.

Firecrawl also publishes `firecrawl-aisdk`. Found does not install that package
as its runtime because it calls Firecrawl directly and would bypass the Convex
component. Its implementation is still an upstream source for our tools. We
will copy and adapt its useful work rather than replacing it with vague tool
descriptions:

- the search-first selection guidance;
- the search and scrape schema constraints that belong in Found's smaller
  interface;
- focused `query` scraping before full markdown;
- main-content, image, cache, and base64-image defaults;
- bounded result handling and response truncation;
- the conversion of tool input, running state, output, and failure into short
  progress labels;
- tests for defaults, malformed responses, empty content, and tool failures.

We do not copy its direct Firecrawl SDK client, environment loading, full
provider option surface, async Agent tool, Interact tool, or generic bundled
tool factory. The adapted implementation runs through `FirecrawlClient` from
`@firecrawl/firecrawl-convex` and keeps the upstream MIT attribution with any
copied source.

The initial agent-facing surface has two research tools.

```ts
type SearchWebInput = {
  query: string
  location?: string
  limit?: number
}

type SearchWebOutput = {
  results: readonly {
    url: string
    title?: string
    description?: string
  }[]
}
```

`searchWeb` discovers sources. It searches the web without scraping the full
content of every result. The default limit is small, and the agent may run
another search when the first query is weak. Search operators remain available
inside `query`; provider-specific source arrays, categories, timeouts, proxy
settings, and scrape options do not enter the tool contract.

```ts
type ReadPageInput = {
  url: string
  focus?: string
}

type ReadPageOutput = {
  url: string
  title?: string
  description?: string
  mode: 'focused' | 'full'
  content: string
  images: readonly string[]
  warning?: string
  truncated: boolean
}
```

`readPage` extracts a known source. With `focus`, it uses Firecrawl's focused
question format for a compact answer about the page and requests images in the same
scrape. Without `focus`, it returns main-content markdown when the agent truly
needs the complete page. The adapter normalizes both forms into `content`,
validates source and image URLs, removes base64 images, and reports truncation
instead of silently returning an oversized tool result.

The agent may issue several independent `readPage` calls in one model step.
Found does not need a second batch tool merely to express parallel reads.

The research tools return source material. They do not return candidates,
candidate sections, confidence labels, or UI instructions. The Found agent
combines their output with the user's request and calls `showCandidates` when
it has something useful to present.

Firecrawl `map` discovers URLs within a website. It is unrelated to the Google
Maps experience and is not an initial research tool. Durable crawl remains
available for a later use case that genuinely needs multi-page progress.
Interact stays outside the default path.

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

The runtime validator owns the implemented type. This shape records the
agent-facing presentation interface.

### Meaning

- `ref` is unique only within one tool output. It connects the candidate's
  Card, Fold row, media, and map focus without pretending to be a global
  accommodation ID.
- `title`, `location`, and `price` form the stable card envelope.
- The model does not select gallery images. The renderer matches candidate
  sources to completed `readPage` outputs in the same message, then filters and
  deduplicates those images for the Card or Fold presentation.
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
- one candidate contains up to 12 sources;
- the renderer attaches up to 6 usable images from matching page reads;
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
- every evidence source ref resolves inside that candidate;
- URLs are valid HTTP or HTTPS URLs;
- coordinates, amounts, and array sizes stay within their bounds;
- unknown information is absent or marked `unresolved`, never invented;
- the payload contains no component names, layout flags, CSS, or executable UI.

### Message and rendering behavior

The validated tool output is stored as a historical tool part in the assistant
message. `showCandidates` does not create or update an application candidate
row. It records only a small server-owned provenance index containing the
session, thread, tool-call ID, and bounded candidate refs. This lets later
mutations reject fabricated references without copying the candidate payload
out of the Agent message.

- 1–2 candidates render as Cards;
- 3–12 candidates render as Fold;
- the same tool part never changes after the turn;
- a later turn may contain another `showCandidates` part;
- Merge begins from an explicit user comparison action and is not a
  `showCandidates` layout option;
- map focus uses the message-local candidate ref when a spatial part appears in
  the same response.

Saving a candidate creates one application-owned relationship containing the
session owner, thread ID, tool-call ID, and candidate ref. It does not copy the
candidate payload out of the historical tool part. The mutation verifies the
relationship against the server-owned provenance index before inserting it.
The thread tray reads those relationships within one thread; Bookmarks reads
the same relationships across the user's threads.

Compare and outreach remain separate user actions. They may act on a candidate
from a historical tool part without requiring that candidate to be saved, and
none of these actions mutates the original message.
