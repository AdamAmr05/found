# Hackathon log

- **Project:** Found
- **Event:** Convex All Gas Hackathon sponsored by OpenAI, Firecrawl, and AgentMail
- **What it does:** A thread-based accommodation research workspace for finding, checking, comparing, and contacting candidates.
- **Live app:** not deployed
- **Repo:** https://github.com/AdamAmr05/found
- **Frontend:** not deployed
- **Convex deployment:** not deployed
- **Components:** none
- **Convex features:** schema
- **Auth:** none
- **AI models:** none
- **Started:** 2026-08-26T13:05:15Z
- **Last updated:** 2026-08-28T01:05:48Z

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

The interactive product still runs on representative fixtures. Convex
persistence, OpenAI generation, Firecrawl acquisition, Google Maps, AgentMail,
auth, and deployment are not connected yet.
