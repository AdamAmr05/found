# Product intent

## Status

This document records the current product decisions, the reasoning behind them,
and the questions that remain open. Implementation contracts and the test
strategy follow once the product model is clear enough to support them.

## The product

Found is a research workspace for one accommodation search. The workspace is a
thread; there is no second product object competing with it.

The user begins with an ordinary message. One agent uses the thread, its
context, and its tools to research the fragmented accommodation market. It
returns useful candidates with evidence instead of a pile of links or a generic
research report.

The goal is an accommodation decision. Research begins the work, but it is not
the whole product.

## What the workspace brings together

The thread is the identity and conversational home of the workspace. It brings
together:

- user messages and streamed agent responses;
- tool calls, tool results, and visible research activity;
- validated generative UI parts;
- accommodation candidates;
- sources, claims, evidence, contradictions, and missing information;
- candidate images and contact routes when they can be found;
- saves, comparisons, rejections, and decisions;
- deliberate references to outreach when they are useful in the conversation.

This does not require one database document or one component-owned schema.
Infrastructure state and product records may remain separate while sharing the
same user, thread, and candidate identities.

## The first research flow

The workspace starts with a message. Useful searches usually need some sense of
place, timing, budget, duration, occupants, and personal preferences. The user
does not have to complete a form or satisfy a fixed intake contract. The agent
notices which missing details would improve the research and asks for them in
ordinary conversation.

The agent may nudge for useful context across a couple of exchanges, but it
does not hold the search hostage. If the user does not know something or wants
to move on, it researches with what it has. This is agent guidance, not a rigid
workflow or a matching engine.

Research surfaces useful candidates as it finds them. Two or more good options
are desirable, but there is no batch size or result count that blocks the
interface. Each candidate should arrive with as much of the following as its
sources support:

- accommodation identity and source URL;
- price and important terms;
- location;
- images;
- evidence for the user's requirements;
- unresolved or contradictory claims;
- a contact route, preferably an email address.

Found records each source image URL with its attribution and displays the image
directly when the origin permits it. Research does not download, proxy, or
re-upload discovered images. If an image fails, the interface falls back
cleanly without blocking the candidate.

Browser interaction is not the default research path. A product that waits
through long interactive sessions before showing value has the wrong shape.
Interaction is reserved for a specific, high-value source that cannot be
understood through faster search and scraping.

## The decision interface

Agent results become interface, not just prose. The agent emits validated parts
from a product-owned vocabulary and never emits executable React.

Firecrawl gives the agent source material. The agent combines those sources
with the user's request and the conversation, decides what is relevant, relates
information that appears to describe the same opportunity, and turns it into
candidate and evidence artifacts. The application does not map raw scrape
results directly into UI.

The agent presents candidates through one structured `showCandidates` tool.
The contract stays small: the agent supplies candidates and their content, not
rendering instructions. One call accepts up to 12 candidates. That ceiling
keeps the tool output manageable; it does not prescribe how many results the
agent should find or show across the conversation.

Each candidate uses the same three sections: `At a glance`, `Evidence`, and
`Next move`. The section structure stays stable so the interface is
predictable. The agent decides what belongs inside each section and leaves
unsupported information absent or explicitly unresolved. These sections stay
inside the existing Card and Fold designs rather than creating separate visual
systems.

The tool output is stored as a part of that assistant message. The part is a
historical snapshot of what the agent showed in that turn and never updates in
place. More research, new context, or a later request may cause the agent to
call the tool again with another set of candidates.

The renderer shows one or two candidates as rich Cards and a larger tool output
as Fold. Merge is separate: it appears when the user explicitly compares
selected candidates rather than being another rendering of the original tool
part.

While an agent run is active, an orb stays at the working edge of the thread.
Tool states become concise, human-readable steps so the user can see the work
without reading provider or implementation details. The orb and steps follow
the current run; completed candidate parts remain in their original messages.

The map is another output of the agent. The agent decides when the user's intent
or the candidate research needs a spatial answer, then uses Maps Agentic UI to
turn that answer into an interactive map, place view, or route. The map does not
decide what a candidate means and the application does not plot raw Firecrawl
results before the agent has interpreted them. Candidate focus and map focus
stay connected when both appear in the same response experience.

Maps Grounding Lite is separate from that presentation layer. The agent may use
it when it needs current place, route, or weather facts. The exact composition
of Agentic UI, Grounding Lite, 3D Maps, and Street View remains open until the
real experiences have been tested.

## Thread tray, Bookmarks, and Compare

The compact pill or tray inside a thread represents the candidates the user has
saved while working in that thread. It is a quick record of what has been done
there and a way back to those candidates without searching through the
conversation.

Bookmarks is a separate, durable product view outside the thread. It gathers
the saved candidates from the user's searches so they remain useful after the
conversation that found them. The thread tray and Bookmarks may query the same
underlying save relationship differently; they do not require duplicate
candidate records and they are not the same interface.

Compare is independent. It is an intentional, temporary decision interaction,
not another name for the thread tray and not a responsibility of Bookmarks.

## Outreach and Inbox

The agent identifies the questions that research could not resolve and shows
them on the candidate. Email can clarify missing terms, open a conversation,
negotiate, or help the user reach an agreement. The interface can offer
`Draft an email`, and the full draft is generated only when requested.

The draft opens in a focused email editor that will be prototyped before it is
implemented. The user may edit the recipient, subject, questions, and body.
Nothing is sent automatically. Approval applies to the exact final content that
will be delivered.

AgentMail owns durable sending, delivery state, inbound messages, and webhook
ingestion. Found presents that activity in a separate Inbox rather than
streaming every delivery event and reply into the research thread. The thread
may link to relevant outreach deliberately, but it does not mirror the mailbox.

The agent needs narrow access to Inbox state so it can answer questions, use a
reply as candidate evidence, or help with a follow-up when asked. Whether that
access is exposed as a tool or another application query is an implementation
contract to decide later.

## Component boundaries

Installed Convex components own the infrastructure and isolated schemas they
already provide. Their internal tables are not recreated in the application
schema.

- The Agent component owns threads, messages, streaming, tool activity,
  sources, files, and model metadata.
- The Firecrawl component owns durable crawl jobs and stored crawl pages.
  Search, scrape, and map are one-shot operations that return source material
  to the agent. Validated agent output becomes historical candidate and
  evidence message parts; raw provider responses do not become product UI.
- AgentMail owns inboxes, email threads, durable sending, delivery state,
  inbound messages, and verified webhook ingestion.
- OpenAI runs through the official AI SDK provider from a Convex action for the
  product agent's reasoning and generated interface decisions.
- Maps Agentic UI gives the agent a spatial presentation layer for interactive
  maps, places, and routes. Grounding Lite is an optional agent tool for current
  place, route, and weather facts.
- Convex owns product state, validation, authorization, realtime updates, and
  durable orchestration where it is required.
- Effect is used at uncertain external boundaries when typed failures,
  decoding, retries, timeouts, cancellation, or concurrency justify the
  additional model.
- The AI SDK works with the Agent component. TanStack Start and React provide
  the product interface.

## Thread lifetime

Found does not decide that a thread is finished for the user. The workspace
remains available for as long as the user wants to continue the search, revisit
a candidate, inspect outreach, or ask another question. Context-window
management is an implementation concern and must not masquerade as product
completion.
