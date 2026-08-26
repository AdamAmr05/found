# Architecture

This document records only decisions that are settled. The product and object
model will be designed with the user before implementation.

## System boundary

Convex is the backend and durable source of truth. TanStack Start is compiled
for the browser and hosted through Convex static hosting. External systems are
called from Convex actions and durable Convex workflows.

## Interaction model

The thread is a chronological interaction surface. The canvas is a persistent,
spatial projection of the current world. Both render the same canonical
artifacts by stable ID through one renderer registry.

The assistant may emit two validated protocols:

- Render parts describe which registered UI renderer presents an artifact.
- Layout operations describe placement, grouping, relationships, and focus.

Neither protocol permits model-generated executable client code.

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
