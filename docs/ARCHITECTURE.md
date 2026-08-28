# Architecture

This document records only decisions that are settled. The product and object
model will be designed with the user before implementation.

## System boundary

Convex is the backend and durable source of truth. TanStack Start is compiled
for the browser and hosted through Convex static hosting. External systems are
called from Convex actions and durable Convex workflows.

## Product intelligence stack

This product is not a generic research agent. It is an adaptive acquisition
environment for fragmented, high-friction markets. Accommodation is the first
expression: the system discovers candidates, understands their real-world
context, turns evidence into decision objects, and coordinates the unresolved
human steps.

Each provider has one clear responsibility:

| System                         | Owns                                                                                                                                               | Does not own                                            |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Firecrawl                      | Discovering the fragmented accommodation market, acquiring listing and operator pages, extracting evidence, and refreshing source snapshots        | Geographic truth, product state, or the final interface |
| Maps Grounding Lite            | Current place facts, routes, travel times, nearby context, and weather through a model-agnostic MCP service                                        | Listing discovery or durable shortlist state            |
| Google Maps Agentic UI Toolkit | Presenting grounded places, routes, place details, imagery, and attribution as interactive inline views                                            | Domain reasoning or canonical artifact state            |
| OpenAI                         | Reasoning over evidence, choosing tools, resolving the user's intent, and emitting validated render parts and layout operations                    | Executable UI code or durable state                     |
| Convex                         | The canonical shortlist, requirements, evidence links, decisions, approvals, runs, thread, canvas projection, authentication, and realtime updates | Reimplementing provider search or map engines           |
| AgentMail                      | Receiving and delivering approved outreach and replies                                                                                             | Deciding what may be sent                               |

In the shortest form:

> Firecrawl finds the fragmented market. Maps Grounding Lite understands the
> surrounding world and real journeys. Agentic UI Toolkit turns geographic
> intelligence into interaction. Convex keeps the user's canonical shortlist,
> requirements, decisions, and live state.

The Google Maps stack is core, not decorative. The current drawn SVG map is a
disposable interaction scaffold. The intended default is Maps Grounding Lite
for model-accessible geographic facts and the Agentic UI Toolkit for their
interactive presentation. Grounding with Google Maps is a possible richer,
Gemini-native path when review synthesis, traffic, or subjective place context
earns the additional provider coupling. Maps Imagery Grounding is private
preview and is not a baseline dependency.

Google Maps results must retain their required source attribution in the same
interaction. Do not assume returned Maps content may be persisted. Before the
schema stores provider content, verify the applicable retention rules and store
only permitted identifiers, user-authored state, and product-owned analysis.

## Interaction model

The thread is a chronological interaction surface. The canvas is a persistent,
spatial projection of the current world. Both render the same canonical
artifacts by stable ID through one renderer registry.

The assistant may emit two validated protocols:

- Render parts describe which registered UI renderer presents an artifact.
- Layout operations describe placement, grouping, relationships, and focus.

Neither protocol permits model-generated executable client code.

The agent chooses from a registered, validated product vocabulary. The same
artifact renderer must work inline in the thread, expanded in an inspector, and
arranged in a comparison or canvas without creating parallel domain records.

## Agent model

The product has one agent. Concurrency is exposed as runs, steps, and tool
activity rather than named specialist agents.

## Effect boundary

Effect v4 models integration services and operational failures. It owns typed
errors, retries, timeouts, cancellation, concurrency, and service substitution
in tests. Convex owns database state, transactions, subscriptions, schedules,
and durable workflows.

## External communication

The agent can propose email but cannot send it. Approval records bind the exact
content hash, user, and time. The delivery capability verifies that approval
before AgentMail is called.
