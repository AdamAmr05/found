# 0001: Foundation

Status: accepted on August 26, 2026.

## Decision

- Use TanStack Start as a static/client application; Convex owns server logic.
- Use Convex as the only database, real-time system, and durable workflow host.
- Use the exact pinned Effect v4 version for integrations and typed operational
  errors without replacing native Convex queries, mutations, or subscriptions.
- Use one agent with visible concurrent runs rather than specialist personas.
- Render canonical artifacts in both the chronological thread and persistent
  canvas through one typed renderer registry.
- Require approval of the exact content hash before any outbound email.
- Use Oxlint as the primary and only linter if its Convex plugin compatibility
  remains green.
- Preserve Firecrawl's pixel-based design-system semantics.

## Deferred

- Product and object model
- Convex Auth v2 integration
- Exact render and layout protocols
- Public product name
