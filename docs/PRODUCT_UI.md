# Product UI contract

Read this after `DESIGN_SYSTEM.md`. That file defines the visual foundation;
this file applies it to the accommodation product.

Found is the product name. These decisions belong to the interaction model and
must remain useful independently of the wordmark.

## Visual calibration

`DESIGN_SYSTEM.md` defines the token model, pixel sizing, typography roles,
palette, and implementation conventions. Production references were measured
to resolve details that the written system leaves open.

The measurements are recorded here so an implementation agent does not need the
internet to apply them:

- The page canvas is `#f9f9f9` (`background-base`). Content surfaces are white.
- The measured sans stack begins with `suisse` / `suisse Fallback`, then system
  sans.
- Landing-page body text is 16/24 at weight 400. The desktop hero is 60/64 at
  weight 500. Continue using the repository's semantic type tokens in product
  UI rather than copying landing-page display sizes indiscriminately.
- Live corner radii include 6, 8, 10, 12, 16, 20, 24, contextual asymmetric
  corners, and full pills. The design system is not anti-curve.
- Concrete live examples: navigation targets are 8px; primary and secondary
  CTAs are 10px; the Interact demo surface is 12px; large landing compositions
  use 16–20px; 24px is rare; tags and circular controls may be full pills.
- The live heat token is
  `color(display-p3 0.980392 0.364706 0.098039)`. Use `#fa5d19` only as the
  sRGB fallback when a surface cannot accept Display P3.
- The authenticated app composer uses a white 20px-radius surface. Its optical
  edge is a 1px, 3%-black ring inside a restrained stack of 2–3%-black shadows;
  the input is 15/24. Primary controls are 32px high with an 8px radius, an
  inset heat shadow, and several tiny heat-colored outer shadows. Found reuses
  that surface and control grammar without copying provider-specific dividers
  or tool controls.
- The live landing ASCII renderer swaps complete multiline frames every 85ms
  using an 8×10 Roboto Mono grid. Frames form coherent moving shapes rather
  than procedurally drifting individual glyphs.
- Each ASCII field instance is one color. Orange fields use `#FA5D19`; gray
  fields use black at approximately 20% alpha and are separate instances. Never
  mix orange and gray glyphs within one field or fade orange into a peach
  texture.

The product uses Switzer as its primary sans. It is loaded through Fontshare's
official API under the ITF Free Font License, which permits free personal and
commercial web use. It is freeware, not open source, so do not modify or vendor
the files. Geist Mono and Roboto Mono are self-hosted from their OFL-licensed
Fontsource packages. Geist Mono owns interface metadata; Roboto Mono owns ASCII
atmosphere glyphs.

## Surface and shape grammar

Corners communicate role. Do not make everything sharp, and do not make every
surface the same rounded card.

| Radius | Product role                                                       |
| ------ | ------------------------------------------------------------------ |
| 0px    | Structural grid edges, separators, and deliberate hard joins       |
| 6px    | Nested selectors, small inset states, and compact evidence labels  |
| 8px    | Navigation targets and compact controls                            |
| 10px   | Buttons, inputs, and short action surfaces                         |
| 12px   | Standard inline artifacts and contained panels                     |
| 16px   | Media cards, maps, inspectors, and substantial decision objects    |
| 20px   | Large immersive compositions with enough visual mass to earn it    |
| 24px   | Rare oversized media or presentation surfaces                      |
| Full   | Pills, tags, avatars, map markers, and genuinely circular controls |

For nested rounded surfaces, keep concentric corners visually related: the
outer radius should usually equal the inner radius plus the gap between them.
Asymmetric corners are allowed when they describe attachment, stacking, or a
shared edge.

Use border, tone, spacing, and elevation before adding another container. A wide
rectangle with a radius is not automatically a card. A surface must have a
clear job, information hierarchy, and action model.

## Product representation model

The product retrieves broad evidence and reduces it to the information that
changes a decision. The model may choose the appropriate registered
representation and layout, but it never generates React, CSS, or an arbitrary
schema.

One accommodation artifact changes resolution without changing identity:

1. `CandidateTile` is the compact scanning representation. It answers “is this
   worth opening?” with image, total cost, location, strongest fit, strongest
   uncertainty, and source freshness.
2. `AccommodationInspect` is the richer decision artifact. It coordinates
   media, price truth, requirements, evidence, map context, and next action.
3. `CompareDock` is the persistent bridge between thread and comparison. It
   shows what is selected and where it will materialize; it is not a second
   shortlist.
4. The comparison or canvas reuses the same artifact IDs and renderers at a
   different layout and resolution.

The current wide implementation is one possible `AccommodationInspect`, not the
universal representation for every state.

## Component vocabulary

### Conversation entry

- The empty conversation groups a 32/36 heading (24/32 on small screens), four illustrated starters,
  and the composer into one centered, scrollable surface. The composer stays
  docked to the bottom once there are messages.
- Starter buttons use 16px corners, a nearly white face, a white upper lip,
  and a small inset lower edge. Hover strengthens the border without lifting
  the surface or increasing its shadow. Pressing gives an inset response.
- Koboyo illustrations are decorative and locally served; each starter's full
  question is its accessible name. Selecting one sends that exact question.
- The white composer retains its 20px corners and surface shadow. An understated
  warm `border-beam` treatment runs only on an untouched, empty conversation.
  Focus or editing dismisses it for that conversation; New thread resets it.
  Reduced motion disables the beam and textarea height transitions.
- The input and send button share one row. The composer starts at 64px high
  and grows with the draft; the send button stays at the lower right.
- The conversation's scroll viewport spans the available page width, including
  the empty margins. Only the inner messages are constrained to 720px, with
  20px mobile / 32px desktop gutters. The composer remains docked while scrolling.
- Keep entry copy to the heading, questions, and input placeholder. No category
  eyebrow, keyboard instructions, or implementation-oriented footer is needed.

### Conversation history

- A collapsible 248px sidebar lists the viewer's existing Agent component
  threads, newest-created first, in pages of 20. It does not duplicate thread
  records in the application schema. Titles come from the first prompt.
- Thread controls share the app header beside the wordmark. New thread appears
  in the header while collapsed and inside the sidebar while expanded. The
  sidebar is dedicated to conversations; global navigation stays in the header.
- The sidebar uses a lightly toned surface; the conversation keeps its original
  canvas with a 20px upper-left corner and a faint inset edge. Conversation rows
  are single-line 40px targets with full titles on hover, no repeated dates, and
  a white selected state. Sidebar controls are 40px targets.
- Opening and closing ease the desktop sidebar's actual width over 200ms, with
  a 160ms opacity transition and at most 6px of content travel. The conversation
  corner follows the same width timing; no text or bordered surface is scaled.
  Exiting history is inert until removal, and reduced motion makes transitions
  instant. Rapid toggles reverse from the current position.
- On screens narrower than 768px, history becomes a native modal drawer with
  background inertness, Escape dismissal, and focus return to its opener. The
  drawer is 288px wide with 20px outer corners. The compact header hides study
  links and uses an accessible icon for Sign out to avoid crowding.
  Selecting a conversation dismisses the mobile drawer.
- Switching threads preserves their unsent drafts for the mounted session,
  resets the message viewport, and resumes the same persisted messages and
  artifacts. New thread creates a record only when the first message is sent.
- Existing agent runs continue when the user switches conversations. Navigation
  pauses only while the send mutation itself is pending.

### External links

- Thread markdown uses Streamdown's link-safety hook with a product-owned native
  dialog. Its default Tailwind modal does not match this app's pixel-based tokens.
- The dialog is centered, capped at 440px, with 24px padding, 16px corners, and
  16px minimum viewport gutters. The full destination wraps and remains selectable.
- Copy link reports success or failure; Open link opens an isolated new tab.
  Escape, the close button, and the backdrop dismiss the dialog and restore focus
  to the originating link. Focus stays inside the modal while it is open.

### CandidateTile

- Optimized for scanning several candidates without opening each one.
- Surfaces total monthly cost before base rent when the sources allow it.
- Shows one decisive match and one unresolved or contradictory claim.
- Uses a stable artifact ID so selection remains synchronized with the map,
  thread, inspector, and comparison.

### AccommodationInspect

- The composed decision surface for one accommodation.
- Hosts the other domain views instead of copying their state.
- Changes resolution through explicit states such as glance, evidence, and
  decision; tabs are only one possible control for those states.

### MediaExplorer

- One image uses a full hero composition.
- Two images use an intentional split composition.
- Three or more use an asymmetric mosaic before opening the full explorer.
- Property, room, street, neighborhood, and city imagery are semantically
  separated. Do not present them as equivalent evidence.
- Expanding an image begins from its exact rendered position with shared-layout
  motion.
- Dragging follows the pointer 1:1 and carries release velocity into the next
  image. It remains interruptible and has button and keyboard equivalents.
- Source, capture time, provider, and possible duplicate-image evidence appear
  contextually rather than permanently covering the image.

### MapScene

- Uses Google Maps Agentic UI as the target presentation layer.
- Can become a local map, commute route, nearby-place view, neighborhood
  context, Street View, or place-detail composition according to the question.
- Keeps selected accommodation and route focus synchronized with every other
  rendering of the artifact.
- Displays required Google attribution in the interaction that uses the data.
- The current custom SVG map is a disposable interaction mock, not a platform
  choice.

### RequirementLedger

- Presents each user requirement as matched, contradicted, or unresolved.
- Separates a source claim from a confirmed fact.
- Reveals the evidence behind a status without forcing every citation into the
  default view.

### CompareDock

- Makes the thread-to-canvas transition legible and reversible.
- Shows drag destination, insertion position, duplicates, and the resulting
  comparison before committing the layout change.
- Dragged previews retain the source object's size, image, and identity long
  enough for the movement to feel causally connected.

### OutreachProposal and ApprovalGate

- `OutreachProposal` states what is unknown, whom the agent proposes contacting,
  and the exact message it wants to send.
- `ApprovalGate` binds approval to the exact message content. Editing the draft
  invalidates the previous approval.
- The primary action morphs between draft, review, approved, sending, sent, and
  failure states without changing position or losing its accessible name.

### ArtifactFrame

- Supplies shared selection, focus, source freshness, expansion, drag, and
  renderer-state behavior to thread and canvas artifacts.
- It is a behavioral shell, not a visual card that forces every artifact into
  the same rectangle.

### AsciiAtmosphere

- A reusable canvas material for whitespace ornament, source activity, and the
  transition from fragmented evidence to a clear decision object.
- Uses Roboto Mono glyphs rather than thousands of DOM text nodes.
- Uses one color per field and morphs full, dense frames through coherent
  spatial forms at the measured 85ms cadence. Orange uses the renderer's exact
  `#FA5D19`, even though text and surface heat tokens may use Display P3.
- Keeps animation state outside React rendering, caps pixel density, and pauses
  outside the viewport or while the document is hidden.
- Reduced-motion mode draws one representative static frame.
- Variants describe spatial jobs: `converge` clears the decision object,
  `margin` occupies unused flanks, `signal` marks a locally active process, and
  `flame` creates a bottom-anchored brand or activity material with one tapered
  body, a curved leading tongue, shorter shoulders, carved gaps, and an ember
  bed. Its tip moves more than its base; it must not inflate as one rounded blob.
- It is atmosphere, not wallpaper. Do not stack variants or place equal-density
  texture behind every artifact.

## Interaction rules

### Adaptive result grammar

- One or two results render as complete `AccommodationInspect` artifacts.
- The third result changes the collection to `Fold`: the existing image,
  title, cost, evidence, and selection identities continue into denser rows.
- Comparison is an explicit user mode, not an automatic consequence of result
  count. `Merge` receives the same artifacts and raises disagreements above
  matching claims.
- Every representation reads one `AccommodationArtifact`. A primary value such
  as all-in monthly cost must not change meaning between the map, card, Fold,
  and Merge.
- Shared-layout motion belongs to identity-bearing internals such as media,
  title, and cost. The bordered outer surfaces do not share transform geometry;
  they enter and leave without distorting their one-pixel edges or corners.

### Representation motion contracts

| Representation | Geometry owner                                                                                            | Stable anchors                                                                                      | Dynamic numbers                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Card           | The measured details viewport animates its real height. The bordered card never transform-scales.         | Media, title, cost, tabs, and save control remain fixed while the details view changes.             | Rent, evidence values, and decision metrics use tabular figures. |
| Fold           | The clipped body owns open and close height. The bordered row does not receive layout projection.         | Media, title, all-in cost, and row position preserve artifact identity.                             | Cost and claim values use tabular figures.                       |
| Merge          | Slots remain fixed; only candidate contents enter, leave, or drag. The comparison surface does not scale. | Candidate identity remains attached to its image, name, cost, and slot throughout drag and removal. | Slot costs and comparison values use tabular figures.            |

All three use interruptible Motion springs for state and spatial changes.
Reduced motion removes travel while preserving the state change.

- Thread and canvas transitions must preserve object identity. Movement should
  explain where an artifact came from and where it went.
- Animate state change, spatial causality, and direct manipulation. Do not
  animate decoration merely because Motion is available.
- Keep direct manipulation outside React's render loop where continuous pointer
  updates require it; commit semantic state at meaningful boundaries.
- Prefer transform and opacity for continuous animation. Shared-layout motion
  must not make surrounding text jump.
- Do not transform-scale a one-pixel bordered surface through a large size
  change. On a small, isolated fold or tray, animate its actual width or height
  and clip the contents so the border and radius remain geometrically correct.
- Give each size morph one geometry owner. Do not combine layout projection on
  the outer surface with a separate height animation inside it; the second
  measurement produces a delayed snap after the first animation finishes.
- Respect reduced motion and provide keyboard equivalents for drag, image
  navigation, map selection, and approval.
- Use proper SVG icons with optical sizing. Do not use a text glyph such as `+`
  as a production icon inside a precision control.
- Inline artifacts need deliberate rhythm with prose: enough separation to read
  as an object, but not so much that the answer becomes a dashboard embedded in
  a chat transcript.

## Build order

Build components individually in the playground, then compose one mocked
journey:

1. Typography and AsciiAtmosphere materials.
2. Candidate scanning and selection.
3. MediaExplorer compositions and image expansion.
4. MapScene with synchronized selection and routes.
5. RequirementLedger and evidence reveal.
6. CompareDock and the thread-to-comparison transition.
7. OutreachProposal and the complete approval-state morph.

Backend integration follows the proven interaction model. Mock data may stand
in for providers, but the mock must preserve the intended artifact identities,
provider boundaries, and states so it can be replaced without redesigning the
UI.
