<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Found repository rules

`found` is the product and package name. Keep branding out of domain concepts
and generated identifiers unless the name is genuinely part of a public surface.

## Architecture invariants

- Read `docs/ARCHITECTURE.md` before changing provider ownership, artifact
  flow, the thread/canvas relationship, or the map stack.
- Read `docs/PRODUCT.md` and `docs/IMPLEMENTATION_CONTRACTS.md` before changing
  agent tools, message parts, candidate renderers, or artifact durability.
- Convex is the only backend and the source of durable truth.
- The canvas and thread are projections of the same canonical artifacts. Never
  duplicate domain state into UI-specific tables.
- The thread is chronological interaction. The canvas is persistent spatial
  state. Moving between them passes stable artifact references.
- There is one agent. Parallel work is represented as runs, steps, and tool
  activity, not fictional specialist personas.
- The model emits validated render parts and layout operations. It never emits
  executable React or arbitrary client code.
- Email sending is capability-gated. The agent may propose a draft, but only a
  user approval mutation may authorize the exact content hash for delivery.

## Effect and Convex

- Before writing any Effect code, read `docs/EFFECT.md` and
  `node_modules/effect/AGENTS.md` completely. Follow links from the installed
  guide when the task requires them, and inspect `node_modules/effect/src` when
  an API is unclear.
- When designing a new Effect service or auditing service and Layer boundaries,
  follow `.agents/skills/effect-service-design/SKILL.md`.
- Use the pinned Effect v4 release. Do not introduce Effect v3 packages.
- Native Convex is the default. An action may stay plain TypeScript. Use Effect
  only when typed integration failures, decoding, retries, timeouts,
  concurrency, resources, observability, or a reusable service seam earns the
  extra boundary.
- Convex `v` validators, the Convex schema, and generated data-model types own
  persisted data and registered function contracts. Effect Schema may own
  external payload parsing and values local to an Effect module; it is not a
  project-wide schema authority. Do not build a generic conversion layer or
  maintain duplicate schema authorities.
- Keep Convex queries and mutations native, short, deterministic, indexed, and
  transactional. Do not wrap subscriptions or client state in Effect.
- Convex Workflow owns durable orchestration. Effect does not replace it.
- Do not split one operation into many Convex calls to fit an Effect pipeline.
  Prefer one deliberate read and one atomic write where the operation permits.
- Do not build Layer graphs for one-off SDK wrappers or construct Layers inside
  loops.
- Never rely on detached Fibers, module-global runtimes, or in-memory caches to
  survive a Convex action.
- Treat services as authority seams, not a default wrapper around every module.
  Keep pure values and deterministic domain logic out of Effect services.

## Convex rules

- Read `convex/_generated/ai/guidelines.md` before editing `convex/`.
- Every registered function has `args` and `returns` validators.
- Prefer internal functions. Expose only functions called by the client.
- Use indexes instead of `.filter()` and bounded reads instead of unbounded
  `.collect()`.
- External APIs belong in actions. Persist their results through internal
  mutations.
- Check installed Convex components and existing repository infrastructure
  before building a parallel implementation.
- Found currently calls OpenAI directly because the Convex AI Gateway requires
  a paid plan. Do not replace that transport with generic Gateway guidance
  unless the user explicitly revisits the decision.
- Do not add authentication until the user supplies the Convex Auth v2 alpha
  documentation.
- Never deploy or modify production data without explicit user approval.

## UI and design system

- Read `docs/DESIGN_SYSTEM.md` completely before creating or changing UI. It is
  the authoritative repository Design System.
- Then read `docs/PRODUCT_UI.md`. It records this product's component grammar,
  interaction rules, and measured visual choices.
- The design system is product-owned. External sites and systems may inform a
  measurement, but their brand, component structure, and application code are
  not repository conventions.
- Preserve its pixel-based numeric sizing model unless the user explicitly
  changes it.
- When prose and repository implementation disagree, inspect the local tokens
  and components and resolve the inconsistency explicitly.
- Shared thread parts and canvas nodes must use the same renderer registry.
- Create components around stable responsibilities and reusable behaviors;
  avoid both monolithic components and arbitrary fragmentation.
- Keep keyboard access, visible focus, reduced motion, and readable contrast.
- Avoid `useEffect` unless synchronizing with an external system. Do not add
  `useMemo` or `useCallback` by default; use them only for a measured or
  contract-driven reason.

## TypeScript and code quality

- Keep TypeScript strict. Do not weaken `exactOptionalPropertyTypes`,
  `noUncheckedIndexedAccess`, or `noImplicitOverride` to make code compile.
- Types must be precise, domain-shaped, and information-preserving. Prefer
  errors as values, tagged unions, narrow ports, and exhaustive handling.
- When a runtime validator is the source of truth, derive its TypeScript type
  with `v.Infer<typeof validator>` instead of duplicating the shape. Preserve
  generated Convex argument, return, `Id`, and `Doc` types.
- Do not declare project-owned application parameters, returns, or type aliases
  as `any` or `unknown`. A library-produced untyped value may exist only locally
  at a genuine external boundary and must be immediately parsed into a precise
  value or typed failure.
- Do not widen known values to `Record<string, unknown>`, use broad index
  signatures as an escape hatch, write `as unknown as T`, use non-null
  assertions, or chain casts. Resolve mismatches with the canonical type,
  parser, validator, constructor, or an explicit adapter.
- The anti-slop rules are deliberate repository policy. A suppression requires
  a local explanation of the invariant that makes the code safe.
- Warnings require triage. Fix a sound warning, add a narrow documented
  suppression when the code is intentionally clearer, or tune the rule when
  its premise is wrong. Do not hand off new warnings without reporting them.
- Keep files and modules single-purpose. Do not keep extending a file that
  mixes routing, validation, authorization, business logic, persistence, and
  response shaping; extract a real responsibility first.
- Avoid god files, but do not create one-use helpers that merely force the
  reader to jump around.
- Complexity warnings begin at cognitive complexity 15 and modified cyclomatic
  complexity 20. Cognitive complexity above 23 rejects the check. Refactor by
  extracting cohesive policy or deepening a module, not by scattering tiny
  forwarding helpers.
- Do not game complexity scores with one-use wrappers. Complexity suppressions
  must be narrow and local, and must not hide tangled authorization or business
  logic.

## Testing

- Test observable behavior through the closest stable public interface.
- Keep tests deterministic with explicit fixtures or factories.
- Unit tests must not use the network or production side effects.
- A test must be capable of catching a broken product behavior or stable
  boundary. Do not add tests that only prove a dependency imports, a mock
  returns what it was told to return, static copy exists, or one implementation
  detail called another.
- Follow Google's Testing on the Toilet principles: keep tests clear, complete,
  concise, and resilient to internal refactors. Prefer state and returned
  behavior over call-sequence assertions.
- Fake only true external systems. Exercise real domain logic, Convex functions,
  and component boundaries when the test harness supports them.
- A regression test should fail against the broken behavior before the fix
  whenever that can be demonstrated safely.

## Required checks

Run `pnpm check` after meaningful changes. It includes TypeScript, the official
Effect language-service diagnostics, Oxlint, complexity checks, formatting, and
unit tests. Run `pnpm test:e2e` for interaction flows and `pnpm deadcode` before
release-oriented work.
