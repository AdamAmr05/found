# Hackathon log

- **Project:** Found
- **Event:** Convex All Gas Hackathon sponsored by OpenAI, Firecrawl, and AgentMail
- **What it does:** A thread-based accommodation research workspace for finding, checking, comparing, and contacting candidates.
- **Live app:** not deployed
- **Repo:** https://github.com/AdamAmr05/found
- **Frontend:** not deployed
- **Convex deployment:** development project provisioned; production not deployed
- **Components:** Agent, Firecrawl
- **Convex features:** schema, components, queries, mutations, internal actions, scheduler, realtime subscriptions
- **Auth:** temporary anonymous session ownership; Convex Auth v2 not connected
- **AI models:** OpenAI `gpt-5.6-luna` (live generation verified)
- **Started:** 2026-08-26T13:05:15Z
- **Last updated:** 2026-08-28T14:01:02Z

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

Defined the Agent component and AI SDK message boundary, OpenAI access through
the Convex AI Gateway, and clean ownership of Zod, Convex validators, and
generated types. Designed the initial Firecrawl-facing `searchWeb` and
`readPage` tools around the Firecrawl Convex component and kept research output
separate from the agent-authored candidate presentation.

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

### 2026-08-28 - researched candidate interface

Connected the first complete research-to-interface path. The Agent component
now exposes typed `searchWeb`, `readPage`, and `showCandidates` tools. Search
and focused page extraction run through the Firecrawl Convex component; Found
turns those sources into a validated historical candidate part; and the real
thread renders one or two candidates as Cards and larger sets as Fold.

Added optimistic message sending, human-readable live tool steps, streaming
Markdown, and the stable At a glance, Evidence, and Next move sections. The
thread now follows streamed content only while the user remains pinned to the
latest message, preserves the reading position when that follow is interrupted,
and offers an explicit jump back to the latest message. Candidate sections
animate through one measured height owner so their outer card geometry remains
stable while the details change.

A live browser run verified OpenAI clarification, persisted streaming,
Firecrawl web search and page reads, structured candidate output, card tabs,
interrupted thread following, and the jump-to-latest path. Shortlist interaction
was initially local UI state. Google Maps, the Bookmarks view, comparison,
outreach, final auth, and production deployment remain unconnected.

### 2026-08-28 - durable shortlist references

Made shortlist state durable without introducing a second candidate model.
Each save stores only the anonymous session owner and the thread, tool-call, and
candidate references; the Agent component's historical `showCandidates` part
remains the sole candidate snapshot. The live Card and Fold renderers now read
that relationship reactively and update it optimistically.

A browser run saved a real researched candidate and confirmed the state after a
full reload. The repository checks, Convex deployment validation, and all 15
browser tests pass.
