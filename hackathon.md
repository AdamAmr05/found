# Hackathon log

<!-- Before maintaining this file, read agent/skills/convex-hackathon-skill/SKILL.md and follow its referenced log format. -->

- **Project:** Found
- **Event:** Convex All Gas Hackathon sponsored by OpenAI, Firecrawl, and AgentMail
- **What it does:** A thread-based accommodation research workspace for finding, checking, comparing, and contacting candidates.
- **Live app:** not deployed
- **Repo:** https://github.com/AdamAmr05/found
- **Frontend:** not deployed
- **Convex deployment:** https://sensible-bee-189.eu-west-1.convex.cloud
- **Components:** @convex-dev/agent, @convex-dev/rate-limiter, @firecrawl/firecrawl-convex, @agentmail/convex
- **Convex features:** schema, indexes, components, queries, paginated queries, mutations, actions, HTTP actions, scheduled functions, realtime subscriptions, rate limiting
- **Auth:** none
- **AI models:** OpenAI `gpt-5.6-luna` (live generation verified)
- **Started:** 2026-08-26T13:05:15Z
- **Last updated:** 2026-08-30T23:36:30Z

## Log

### 2026-08-26 - 48a4bb5

Set up TanStack Start with an intentionally empty Convex schema, Effect v4,
Oxlint, the Convex ESLint plugin, and repository conventions. Added the Agent,
Workflow, Workpool, Firecrawl, AgentMail, and static-hosting packages without
registering their components yet.

### 2026-08-27 - b1d2a8b

Built a front-to-back accommodation interaction lab around six fixture
candidates and nine representations for scanning, source inspection, triage,
cost comparison, focused review, pairwise comparison, requirement ranking,
trade-offs, and evidence freshness. Focus, shortlist membership, and budget
stay synchronized across the representations. Added browser coverage for the
main interactions and responsive overflow.

The prototype suite also includes an inline map and accommodation inspector,
approval-gated outreach, and an animated ASCII atmosphere with orange and gray
modes, reduced-motion support, visibility pausing, and a dedicated flame form.

### 2026-08-27 - fd8dea7

Repaired the Fold and shortlist geometry so their borders, corners, content,
and compact tray morph together cleanly. Renamed the product Found across the
application and documentation.

### 2026-08-27 - cd907fa

Unified the map, complete cards, Fold, and Merge around one provisional
accommodation artifact. One or two results stay richly composed, a third
condenses the same identities into Fold, and an explicit Compare action turns
the same claims into a divergence-first Merge view.

### 2026-08-28 - 5ed4cfc

Defined Found as one thread-backed accommodation research workspace. Documented
historical generative UI parts, the stable `showCandidates` contract,
Card-to-Fold rendering, bookmarks, comparison, and approval-gated outreach
without inventing the application schema (`docs/PRODUCT.md`,
`docs/IMPLEMENTATION_CONTRACTS.md`).

### 2026-08-28 - 097d1f8

Initially designed the Agent component and AI SDK message boundary around the
Convex AI Gateway, plus clean ownership of Zod, Convex validators, and generated
types. That gateway plan was later superseded by direct OpenAI access. Designed
the initial Firecrawl-facing `searchWeb` and `readPage` tools around the
Firecrawl Convex component and kept research output separate from the
agent-authored candidate presentation.

### 2026-08-28 - 9283973

Registered the Convex Agent component and connected the first real product
slice. Found now creates durable, session-owned Agent threads, stores user and
assistant messages through the component, schedules model work in an internal
action, persists stream deltas, and renders live UI messages in the real
composer. The agent calls OpenAI directly through the official AI SDK provider
with a server-owned `gpt-5.6-luna` model choice.

Added ownership checks around every public thread read and write, a durable
failure path when provider configuration is missing, and browser coverage for
the new conversation entry point. Local OpenAI generation still needs a key in
the Convex deployment environment; no key is exposed to the browser.

### 2026-08-28 - 7441ad8

Created the real `adamamr05/found` Convex cloud project with a development
deployment in Europe. Refreshed the generated Convex repository guidance and
removed its superseded duplicate Cursor rule.

### 2026-08-28 - ec6ee41

Moved the agent to OpenAI `gpt-5.6-luna`, separated stable agent identity from
per-run capability instructions, bounded the tool loop, and throttled persisted
stream deltas. Replaced a dependency-only Effect smoke test with a browser test
that sends a real message through Convex and proves the Agent thread survives a
reload. Added repository guidance requiring behavior-focused, refactor-resilient
tests and narrow fakes at true external boundaries.

The interactive product still runs on representative fixtures. Convex
persistence and the Agent message stream are connected. Firecrawl acquisition,
Google Maps, AgentMail, final auth, and production deployment are not connected
yet.

### 2026-08-28 - 036662e

Mounted the Firecrawl Convex component with typed deployment environment
variables and made the OpenAI key an explicit backend requirement. Verified
both integrations against the development deployment: Firecrawl returned a
live official Berlin housing result through the component, and OpenAI
`gpt-5.6-luna` produced and persisted an assistant reply through the Agent
component. The agent-facing Firecrawl research tools remain the next
implementation step.

### 2026-08-28 - 45344f5

Connected the first complete research-to-interface path. The Agent component
now uses typed `searchWeb`, `readPage`, and `showCandidates` tools. Firecrawl
provides source material; the agent turns it into historical candidate parts;
and the thread renders Cards or Fold with streaming text, visible tool progress,
stable sections, and anchored scrolling.

### 2026-08-28 - 4def6a3

Made shortlist state durable without copying candidate payloads out of Agent
messages. Saves keep only the session, thread, tool-call, and candidate refs;
server-side provenance rejects fabricated relationships. Hardened candidate
evidence, prices, images, accessibility, motion, and Firecrawl failures while
keeping the model-authored snapshot stored once in its historical tool part.

### 2026-08-28 - 3260cb2

Refined the first live research interface into a cohesive result flow. Real
Firecrawl page media, evidence, candidate previews, Card/Fold motion, and the
thread composer now behave consistently from streamed response through
saveable result views. Added focused contract tests and kept the full browser
suite green.

### 2026-08-29 - fc2c2ab

Added durable saved-candidate views without copying Agent snapshots. One indexed
relationship table powers the paginated thread shortlist and global Bookmarks,
while provenance validates each save against its exact message and tool part.
Hardened stream-time saving, thumbnail attribution, broken-reference isolation,
thread restoration, and Card/Fold media continuity. Convex features: tables,
indexes, paginated queries, mutations, and realtime subscriptions
(`convex/schema.ts`, `convex/savedCandidates.ts`, `convex/candidateParts.ts`).

### 2026-08-29 - fd09ade

Turned the research thread into a place you can enter, not just a list of
results. A candidate remains the same artifact as it moves from Card or Fold to
its map pin: choosing it opens the scene, the terrain-aware camera dives from
the overview and settles into an orbit, and the user can continue down to
Street View. Weather, routes, and place cards keep that atmospheric movement
tied to grounded details about what it may feel like to be there
(`src/features/accommodation/MapScene.tsx`,
`src/features/accommodation/ImmersiveMapOverlay.tsx`).

The Agent grounds that scene through place search and resolution, routes, and
weather, then persists one structured `showMap` part in its durable thread.
Registered `@convex-dev/rate-limiter` and hardened the provider boundary with
typed decoding, cancellation, selective retries, attribution, route warnings,
offscreen WebGL cleanup, and contract tests (`convex/tools/maps.ts`,
`convex/tools/mapsAdapter.ts`, `convex/thread.ts`).

### 2026-08-30 - 70f08e9

Shipped outreach as a first-class artifact inside the research thread. The
agent turns a request into a live email card whose recipient, subject, and body
can be edited directly and are saved to Convex. “Ask for changes” expands in
place, shows the AI's proposed revision in context, and offers Undo or Accept
without adding chat clutter. Sending still requires explicit approval of the
exact draft, then the card carries its delivery state into a separate Inbox
when replies arrive (`convex/outreachDrafts.ts`, `convex/outreachDelivery.ts`,
`src/features/outreach/OutreachDraft.tsx`, `src/features/outreach/InboxPage.tsx`).

Registered the AgentMail component and webhook and gave the agent narrow tools
for drafting and reading relevant replies. Seven outreach follow-ups, from
`35eca60` through `70f08e9`, hardened the same flow: delivery and resend states
cannot regress, delayed sends can recover without polling forever, human and
agent unread state stay separate, paid revisions cannot overlap, long or
HTML-only mail is safely normalized, and a rare unknown delivery state offers
a one-shot status check. Verified the full loop with a real AgentMail send and
inbound replies in the browser
(`convex/convex.config.ts`, `convex/http.ts`, `convex/outreachMailbox.ts`,
`convex/outreachRevision.ts`).
