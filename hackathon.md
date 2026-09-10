# Hackathon log

<!-- Before maintaining this file, read .agents/skills/convex-hackathon-skill/SKILL.md and follow its referenced log format. -->

- **Project:** Found
- **Event:** Convex All Gas Hackathon sponsored by OpenAI, Firecrawl, and AgentMail
- **What it does:** A thread-based accommodation research workspace for finding, checking, comparing, and contacting candidates.
- **Live app:** https://mellow-hamster-66.convex.site
- **Repo:** https://github.com/AdamAmr05/found
- **Frontend:** Convex static hosting
- **Convex deployment:** https://mellow-hamster-66.convex.cloud
- **Components:** @convex-dev/agent, @convex-dev/auth, @convex-dev/rate-limiter, @convex-dev/static-hosting, @convex-dev/workpool, @firecrawl/firecrawl-convex, @agentmail/convex
- **Convex features:** schema, indexes, components, queries, paginated queries, mutations, actions, HTTP actions, scheduled functions, realtime subscriptions, rate limiting, file storage
- **Auth:** Convex Auth
- **AI models:** OpenAI `gpt-5.6-luna` (live generation verified), `gpt-transcribe` (voice transcription verified in development)
- **Started:** 2026-08-26T13:05:15Z
- **Last updated:** 2026-09-10T14:21:01Z

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

### 2026-09-03 - 65430eb

Added Convex Auth v2 with Google OAuth and username/password sessions, an
app-owned user record, protected application routes, and owner-derived access
across threads, saved candidates, and outreach. Internal jobs carry the same
Found user ID and repeat ownership checks (`convex/auth.ts`, `convex/users.ts`,
`convex/viewer.ts`, `convex/threadAccess.ts`).

Rebuilt sign-in as a responsive Found-colored split interface with a
visibility-aware dither shader and Google's official mark. Agent runs now read
one provider-neutral display name and include it as inert profile context so
email drafts can use the real sender name (`src/features/auth/SignInPage.tsx`,
`src/features/auth/AuthDitherShader.tsx`, `convex/agentInstructions.ts`).

### 2026-09-04 - adf6f35

Made the workspace easier to enter and revisit: four illustrated starters, a
compact composer, a properly sized external-link dialog, scrolling from the page
margins, and a conversation-history sidebar. History uses the Agent component's
owner-scoped, paginated query rather than another thread table
(`convex/threadHistory.ts`, `src/features/thread/ThreadWorkspace.tsx`).

Grouped repeated research steps into a collapsible history and kept one randomly
chosen monochrome orb stable throughout each assistant turn. Malformed embeds
are omitted while useful response text remains. Added repeatable development
account verification and checks for activity transitions, keyboard access, and
reduced motion (`docs/VERIFICATION.md`, `src/features/thread/ThreadTranscript.tsx`,
`tests/e2e/thread-activity.spec.ts`). The latest checks passed 77 unit tests and
four focused browser tests; the full 21-test browser suite passed before the
final orb-selection adjustment. No production deployment was performed.

### 2026-09-04 - 003767e

Unified Chat, Inbox, and Bookmarks under one persistent header and history
sidebar, preserved drafts across navigation, and reused the white card material.
Kept development studies out of production routes. Stable streamed-part keys
now preserve card tabs and open source dialogs when earlier results arrive
(`src/features/navigation/AppWorkspace.tsx`, `src/features/thread/ThreadMessage.tsx`).

Replaced the inbox’s 100-conversation cutoff with owner-scoped, indexed Convex
cursor pagination in batches of 20. Verified that Bookmarks already paginates,
and kept both Load more controls visible and disabled while fetching. Tests
reach all 105 inbox fixtures across six pages without crossing account boundaries
(`convex/outreachInbox.ts`, `convex/outreachInbox.test.ts`). The layout passed
25 browser tests and a production build; pagination passed 79 unit tests and
two focused browser tests. Synced the backend change to development only.

### 2026-09-04 - fb0c652

Refined the editable email header's spacing and transitions, preserved the
change-request field during expansion, and animated the Send glyph on hover
and keyboard focus with reduced-motion support
(`src/features/outreach/OutreachDraftHeader.tsx`,
`tests/e2e/outreach-header.spec.ts`).

### 2026-09-05 - e2f6899

Found can now follow a promising search result to its individual apartment
listing, giving users a direct source to explore alongside the candidate's
photos, evidence, and map. Firecrawl supplies the listing details, and OpenAI
uses them to explain how a place fits the search. Users can ask Found to recheck
current terms and clarify restrictions before deciding what to save or whom to
contact. Unanswered questions remain part of the exploration rather than
preventing a useful place from being shown.

### 2026-09-07 - 70cf3d0

Published Found's frontend and Convex backend together in US production using
the registered static-hosting component. The SPA entry preserves deep links,
authentication routes, and the AgentMail webhook (`convex/convex.config.ts`,
`convex/http.ts`, `vite.config.ts`). Added animated primary navigation, tightened
mobile spacing, and replaced the sign-out text with an accessible icon.

Since the previous entry, repaired earlier-message pagination and scroll
anchoring, corrected ASCII canvas resolution during expansion, shared email
writing instructions across drafting and revision, and fixed markdown styling
(`src/features/thread/useHistoryScrollAnchor.ts`, `convex/outreachWriting.ts`).

Verified production password sessions, live research, maps, saved candidates,
manual and AI draft edits, and an approved test email redirected to the owner.
The owner's reply reached Inbox with unread state, persisted after reload, and
was read correctly by the agent, confirming the production signing-secret and
webhook flow without contacting a researched property.

Separated private server Maps keys from the restricted public browser key.
The client-bundle scan found no backend secrets, unsigned webhook requests were
rejected, and tested unauthorized Maps calls were blocked. Checks passed with
83 unit tests and 34 browser tests; password-session verification passed again
after the icon change. Google OAuth sign-in remains unverified end to end,
Maps shows its alpha-channel notice, and the dead-code check still reports
existing unused files, dependencies, and exports.

### 2026-09-09 - 7390d6f

Gave Found a carefully composed landing page at `/`. I wanted it to feel warm,
open, and quietly hopeful: somewhere to pause and imagine what comes next.
The orange shader moves behind soft off-white lettering, while a small vector
scene of someone looking toward a neighborhood gives that feeling a human
presence. I spent time on the space between things, the balance of color and
type, and the way the entry button fits into the frame. The care lives in
those small decisions, down to the arrow's gentle roll on hover or keyboard
focus. Motion respects reduced-motion settings, and the shader pauses when
hidden (`src/features/landing/`).

Moved the workspace, Inbox, and Bookmarks under `/app`. Open found uses the
existing Convex Auth session gate: signed-out visitors see authentication,
while verified sessions enter the workspace. Added routes back to the landing
page, replaced preview assets and controls with the final SVG and production
components, and hid the dismissible Maps alpha notice
(`src/routes/app.tsx`, `tests/e2e/landing.spec.ts`, `src/styles/app.css`).

Checks passed with 83 unit tests and a production build. Both landing/session
browser tests passed; the broader browser run passed 35 of 36, with the
scroll test passing on its focused rerun. Verified arrow motion for pointer,
keyboard, and reduced-motion settings. These changes are pushed to main;
production deployment of this update is not yet verified.

### 2026-09-10 - c82b26d

Added voice input to the composer with a quiet live waveform, timer, and stable
microphone and send controls. Stop appends the transcript to the existing draft;
Transcribe and send submits it, while Discard leaves the draft untouched.
Recording stops automatically at five minutes, releases the microphone, and
rejects audio over 3 MiB before upload (`src/features/thread/voice/`,
`src/features/thread/ThreadComposer.tsx`).

The authenticated Convex action calls OpenAI `gpt-transcribe`, validates WebM
and MP4 audio, and budgets calls per user through the registered rate limiter
(`convex/voiceTranscription.ts`, `shared/voiceRecording.ts`). Verified actual
speech reaching the draft through the development backend. The browser test now
requires recognizable speech from a checked-in audio fixture; provider errors
cannot count as success. Checks passed with 102 unit tests and all 37 browser
tests; the existing unrelated complexity warning remains.

Also refined the landing copy and centered its illustration with an inset
matching the text (`src/features/landing/`). These changes are pushed to main;
production deployment of transcription is not yet verified.

### 2026-09-10 - inbound attachments

Traced missing attachments in Inbox. Outlook's `<url> url` pairs are
plain-text links rather than attachments. AgentMail describes actual files in
its webhook payload, but the thread reader previously dropped that metadata
and did not preserve the bytes behind expiring download URLs.

Found now records one `outreachAttachments` row per attachment in the same
mutation that marks a reply, then moves the bytes into Convex file storage
through a scheduled, idempotent transfer with bounded retries, a 10 MiB cap,
and an owner-requested retry for permanent failures. Thread reads also record
attachments they see, so earlier replies are captured on their next open. Inbox
lists each message's files as reactive chips that open the stored file, and
the agent's thread projection names attachments without receiving bytes
(`convex/outreachAttachments.ts`, `src/features/outreach/MessageAttachments.tsx`,
`docs/IMPLEMENTATION_CONTRACTS.md`).

Also cleaned up how reply bodies read. Outlook's duplicated `<url> url` and
`<mailto:x> x` pairs collapse to one address and blank non-breaking paragraphs
disappear before the body reaches Inbox or the agent; Inbox then renders web
and email addresses as links behind the existing external-link dialog, without
passing untrusted mail through the Markdown renderer
(`convex/outreachMailText.ts`, `src/features/outreach/MailBody.tsx`).

Added a state filter to Inbox, ported from tw-connect's shipments list: an
optional state on the paginated query switches to a state-prefixed index, and
the page shows All, Replied, Sent, Drafts, and Failed as plain text options
(`convex/outreachInbox.ts`, `src/features/outreach/InboxFilter.tsx`).

Restructured the Inbox row into three tiers: place, then the email subject in
black, then address and time as monospace metadata, with the delivery state as
a plain colored word rather than a pill (`src/features/outreach/InboxRow.tsx`).

Initial checks passed with 110 unit tests and a production build; the existing
unrelated complexity warning remained. New fixture-based browser specs cover
the link rendering, dialog, attachment chips, and row hierarchy. Attachment
capture was also verified against the development backend before the review
follow-up below.

Review follow-up: attachment transfers now use the already-installed Workpool
component for bounded concurrency, durable retries, and completion after
runtime interruption. Attachment subscriptions read only the displayed message
through an outreach/message index instead of truncating the conversation at
200 files. Regression tests cover the cutoff, exhausted retries, interrupted
completion, stale callbacks, and duplicate settlement. Workpool's exported test
helper required a one-line package patch to preserve a compile-time assertion
without an unused local under the repository's strict TypeScript settings.

Follow-up validation: `pnpm check` passed 114 unit tests with the existing
CandidateMedia complexity warning; all 40 browser tests, reusable-account
verification, and the production build passed. Synced to the development
deployment and verified that rerunning a completed transfer preserves its
stored state. `pnpm deadcode` still reports existing unused code and browser
fixture entry points it does not recognize; no production deployment was run.

### 2026-09-10 - f5f6e82

Committed and pushed the reviewed attachment and Inbox changes to main.
Workpool recovers interrupted downloads, while indexed reads fetch only the
attachments on each displayed message (`convex/outreachAttachmentTransfers.ts`,
`convex/outreachAttachments.ts`). Final checks passed 114 unit tests, 40 browser
tests, and the build; existing complexity and dead-code findings remain.
Verified in development; this update has not been deployed to production.

### 2026-09-10 - 757cf02

Added delivery-state filters to Inbox with owner-scoped, indexed pagination:
All, Replied, Sent, Drafts, and Failed. Opening an email keeps the list mounted
but hidden, so returning preserves the selected filter and all loaded pages
(`convex/outreachInbox.ts`, `src/features/outreach/InboxPage.tsx`).

The new browser regression exercises the real Inbox page and Convex pagination
with a fixture WebSocket transport. It reproduced the filter reset before the
fix and passed afterward. The full check passed with 115 unit tests; all 42
browser tests passed, and React Doctor scored 100. The existing CandidateMedia
complexity warning remains. Dead-code checking still reports existing findings
and HTML-loaded browser fixtures, including the new Inbox fixture, as unused.
The reusable development account verification also passed during review.

Committed and pushed the code to main. This change was not deployed to
production; the browser regression verifies UI state against fixture responses,
while the Convex unit tests verify indexed filtering.
