# Effect conventions

This document adapts the pinned Effect v4 guidance, Dillon Mulroy's service
design rules, and the current OpenCode Effect migration guidance to this
repository's Convex execution model.

It is intentionally narrower than a general Effect style guide. Convex remains
the backend, transaction system, durable scheduler, database, and public
function boundary. Effect makes uncertain computation inside those boundaries
typed, composable, observable, and testable.

## Source of truth

Before writing Effect code:

1. Read `node_modules/effect/AGENTS.md` completely.
2. Read this document completely.
3. When an API is unclear, inspect the pinned source under
   `node_modules/effect/src` rather than relying on remembered Effect v3 APIs.

The pinned Effect source wins when this document and the installed release
disagree. Convex's generated guidance wins for code inside `convex/`.

All reference material required to apply these conventions is available without
network access:

- `.agents/skills/effect-ts/SKILL.md`
- `.agents/skills/effect-service-design/SKILL.md`
- `docs/references/effect/OFFICIAL_EFFECT_GUIDE.md`
- `docs/references/effect/EFFECT_LANGUAGE_SERVICE.md`
- `docs/references/effect/CODING_STANDARDS.md`
- `docs/references/effect/opencode/`

See `docs/references/effect/README.md` for the pinned versions, upstream commits,
and license information for these snapshots.

## The division of responsibility

| Concern                                                                  | Authority                                               |
| ------------------------------------------------------------------------ | ------------------------------------------------------- |
| Convex documents, indexes, persisted states                              | `convex/schema.ts` and Convex `v` validators            |
| Registered Convex function arguments and returns                         | Convex `args` and `returns` validators                  |
| Generated Convex IDs and data-model types                                | `convex/_generated/dataModel`                           |
| Untrusted Firecrawl, AgentMail, AI, webhook, and other provider payloads | Effect `Schema` at the adapter boundary                 |
| Values local to an Effect module                                         | Effect `Schema` when it materially improves that module |
| Compile-time relationships that require no runtime parsing               | TypeScript types                                        |

Effect Schema may parse external payloads and model values local to an Effect
module. It is not the project's universal domain-schema authority and does not
replace Convex validation. Do not create a generic validator-conversion
abstraction or mirror every persisted record in both systems. At a real
handoff, perform an explicit, small mapping. The duplication is acceptable only
when each representation protects a different runtime boundary.

## Where Effect belongs

Native Convex is the default. An action does not need Effect merely because it
performs external I/O. Add Effect when the operation materially benefits from
one or more of these capabilities and the benefit is greater than the boundary
and composition cost:

- shared adapters for external APIs and model calls;
- decoding non-trivial unknown provider responses;
- typed failures that callers actually distinguish;
- retries, timeouts, cancellation, and bounded concurrency;
- scoped acquisition and cleanup;
- application policy that coordinates several uncertain operations;
- structured logs, spans, and metrics;
- service Layers that provide honest production and test implementations.

A simple action with one provider call, local error translation, no shared
service boundary, and no special concurrency or resource policy should remain a
plain Convex action. Do not build a Layer graph to wrap one SDK method.

Keep these native or pure:

- Convex queries and mutations;
- Convex subscriptions and React client state;
- deterministic parsing already owned by a Convex validator;
- calculations, projections, render-part transforms, and constructors that do
  not perform effects;
- request values and per-call options;
- wrappers that only rename another service.

Do not use Effect merely to make synchronous code look uniform. A pure function
is easier to understand, test, and reuse than an unnecessary Effect program.

## Convex action boundary

A Convex action is a framework handler, not automatically an Effect composition
root. Choose the smallest honest shape for each operation:

1. **Native action:** use ordinary TypeScript and the provider SDK for a simple,
   self-contained call.
2. **Effectful adapter:** run a focused Effect around one genuinely uncertain
   boundary when typed decoding, timeout, retry, or observability earns it.
3. **Application Effect:** compose services and Layers for a multi-step
   operation with reusable policy or several capabilities.

Only in the second and third cases does the action run an Effect. When it does:

1. Convex validates the action arguments.
2. The handler builds the operation's Effect.
3. It provides only the Layers that operation requires.
4. It runs the Effect once at the framework boundary.
5. It maps the result into the Convex-validated return shape.

Durable reads and writes still happen through Convex queries and mutations;
that is Convex's normal action model, not an Effect workaround. Avoid turning
every Effect step into a separate Convex call. Fetch the operation's required
state in one deliberate internal query where practical, and commit related
changes in one deliberate internal mutation where their atomicity belongs.

Keep `ActionCtx` near the framework boundary. Introduce a narrow
application-owned persistence port only when the operation is reused, needs an
honest test seam, or benefits from hiding several Convex calls. A one-off action
may call `ctx.runQuery` or `ctx.runMutation` directly. Never pass the whole
Convex context into domain code or expose generated Convex types through an
external provider adapter.

Do not construct Layers repeatedly inside loops. Build the operation Layer once
per action invocation, or reuse a safely scoped composition where the Convex
runtime model permits it. Do not assume module-global runtimes or Layer caches
survive across invocations.

An Effect Fiber is in-process concurrency, not durable work. Never fork a
detached background Fiber and assume it survives the Convex action. Use Convex
Workflow, Workpool, the scheduler, or another explicit durable primitive for
work that must outlive the function invocation, survive retries, wait for a
human, or resume later.

## Writing Effect code

- Prefer `Effect.gen` for a single composed program.
- Define reusable Effect-returning functions with a named `Effect.fn`.
- Do not return `Effect.gen` from a normal function when `Effect.fn` expresses
  the function directly.
- In a generator, use `yield*` and `return yield*` for a failure or other Effect
  whose success type is `never`.
- Add combinators around the generator when they clarify retry, timeout,
  tracing, or recovery policy.
- Use `Effect.fnUntraced` only for small internal helpers where a span would be
  noise. Public service operations should normally be traced and named.
- Within a substantial Effect module, prefer Effect's `Clock`, `DateTime`,
  `Random`, `Config`, `HttpClient`, `Predicate`, `Schedule`, and scoped resource
  primitives as the default when they participate in the program's semantics.
  Do not re-wrap Convex persistence, durable workflows, realtime state, or a
  capable provider SDK merely to make them Effect-shaped.
- Use `Effect.callback` for callback APIs and the appropriate async constructor
  for Promise APIs. Never hide a lazy Promise in `Effect.sync`.

Run `pnpm effect:diagnostics` to catch Effect-specific mistakes that ordinary
TypeScript and Oxlint cannot see.

## Services are authority seams

Before adding a service, apply the service test. A service must own a meaningful
capability such as credentials, external I/O, configuration, time, randomness,
runtime resources, lifecycle, reusable effect sequencing, or policy with real
production and test variation.

The module should survive this deletion test: removing it would force real
complexity or authority into several callers. If deleting it only removes a
name-forwarding wrapper, keep the code as a value or pure module instead.

When a service is justified:

- keep domain modules pure;
- put operation policy and application-owned ports in the application layer;
- keep provider SDK types and configuration inside the adapter;
- let the composition root choose concrete Layers;
- yield stable dependencies while building the Layer and close over them in
  service methods;
- yield operation-scoped dependencies inside the method that uses them;
- keep the interface narrow, domain-shaped, and precise about expected errors;
- provide `layerWithoutDependencies` when callers need to compose requirements;
- provide a production `layer` only where the module truthfully owns the
  concrete dependency choice;
- export `layerTest` or `layerMemory` only when it is complete and honest for
  the name.

Prefer an existing Effect service before defining an application service. A
Firecrawl, AgentMail, or model-provider integration becomes an Effect service
when it owns shared policy, resources, lifecycle, or meaningful production and
test variation. Otherwise, keep it a plain module or function. A search
request, extracted listing, email draft, canvas node, or render part is a value,
not a service.

## Schemas and domain values

Parse untrusted external input at the adapter edge. Once decoded, pass domain
values inward instead of raw SDK response objects.

- Use `Schema.Class` for domain identities with behavior or shared schema
  semantics.
- Use `Schema.Struct` for local structural shapes.
- Use brands and refinements for identifiers or values whose invariants matter.
- Model states and transitions with tagged unions, not bags of optional fields
  and booleans.
- Push optionality toward input boundaries; avoid `Partial` unless partiality is
  a genuine domain state.
- Prefer constructors that make invalid states unrepresentable.
- Use Effect `Predicate` helpers instead of handwritten primitive type guards.

Do not re-parse a value merely because it crosses a function. Parse once at the
boundary that receives untrusted data, then retain the refined type.

## Expected errors and defects

Errors are part of the service contract.

- Represent expected operational failures with `Schema.TaggedError` and keep
  the error union as narrow as the caller can usefully handle.
- Translate provider exceptions and SDK error shapes into application-owned
  errors in the adapter where they occur.
- Preserve an unknown cause with `Schema.Defect` when it is useful for logging
  or diagnosis; do not leak provider error types through the port.
- Treat defects as violated invariants or programmer bugs, not routine control
  flow.
- Recover by tag at the layer that owns the fallback policy.
- Do not erase the error channel into `unknown`, global `Error`, or a vague
  catch-all error.

Effect error objects are not automatically Convex wire formats. Before
persisting or returning a failure, map it to an explicit serializable projection
validated by Convex.

## Retry, idempotency, and durability

Every retry has one owner. Do not stack an Effect retry, a provider SDK retry,
and a Convex Workflow retry without deciding which failures each one owns.

- Use `Schedule` for bounded, observable retry policy within one action.
- Apply timeouts at the provider operation boundary.
- Use bounded `Effect.all` or `Effect.forEach` concurrency for parallel provider
  work; never allow unbounded fan-out from scraped data.
- Use `Effect.acquireRelease` and scoped Layers for resources that require
  cleanup.
- Make external side effects idempotent before enabling automatic retries.
- Store or derive stable idempotency keys for email, provider mutations, and
  workflow steps.
- Use Convex durable orchestration for waits, approval gates, resumable work,
  and progress that must survive function termination.

For outbound email, the approval mutation authorizes one exact content hash.
Any change to recipients, subject, body, or attachments invalidates that
approval. The delivery adapter must consume an idempotency key so a retried
workflow cannot send twice.

## Caching and runtime lifetime

Effect caches and memoized Layers are scoped to the runtime that owns them. In a
Convex action, assume that runtime is short-lived and that no in-memory cache
survives the invocation.

Use Effect caching to deduplicate shared in-flight work within one operation.
Use Convex for durable or cross-invocation cache state. Never depend on module
globals, a long-lived `ManagedRuntime`, or a background loop being preserved by
the Convex runtime.

## Observability and secrets

- Name `Effect.fn` operations with stable capability-oriented names.
- Add spans around external calls and meaningful application operations.
- Log structured fields such as run ID, step ID, provider, attempt, duration,
  and outcome.
- Use `Redacted` for secrets and provider tokens.
- Never log raw credentials, full scraped documents, private email bodies, or
  model prompts by default.
- Preserve a safe provider request ID or error fingerprint where it helps
  debugging.

## Testing

Tests should cross the same service contract as production.

- Use Layers and real seams instead of module mocks and spies.
- Keep one-off fakes inside the test unless they form a complete reusable
  implementation.
- Call something `layerMemory` only if it preserves the observable production
  contract, including ordering or transaction behavior that callers rely on.
- Use a local protocol substitute when serialization, persistence, or webhook
  behavior matters.
- Control time through Effect services instead of sleeping.
- Exercise typed failure branches as first-class outcomes.
- Do not add `@effect/vitest` until its released peer requirements support this
  repository's Effect v4 and Vitest versions.

## What we take from OpenCode

OpenCode is useful evidence for Effect style, not a runtime blueprint for a
Convex application. We adopt:

- named `Effect.fn` service operations;
- `Effect.gen` for real multi-step composition;
- schema-backed domain values and tagged expected errors;
- transport-agnostic services and provider-specific adapters;
- dependency-preserving Layers and test Layers;
- strict failure-channel types and explicit third-party error translation;
- no floating Promises or Effects;
- generator-compatible lint configuration;
- tests that provide Layers instead of mocking modules.

We do not copy OpenCode's long-lived application runtime, process lifecycle,
SQLite ownership, filesystem services, background Fibers, or server-specific
composition. Convex already owns those concerns differently. We also do not
copy repository-specific re-export and namespace conventions unless they solve
a demonstrated problem here.

## Review checklist

Before accepting Effect code, verify:

- The action genuinely benefits from Effect; a native action was considered.
- Convex and Effect each validate only the runtime boundary they own.
- Pure logic stayed pure.
- Every service passed the authority-seam and deletion tests.
- Layer construction is outside loops and no needless Convex round trips were
  introduced.
- Provider types stop at the adapter.
- Expected errors are tagged, useful, and precisely typed.
- Retry policy has one owner and side effects are idempotent.
- Concurrency is bounded and resources are scoped.
- No detached work assumes a Convex action will stay alive.
- Durable transitions use Convex functions and validators.
- Tests provide honest Layers and cover failure behavior.
- `pnpm check` passes.
