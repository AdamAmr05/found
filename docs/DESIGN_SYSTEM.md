# Design System

This document defines the product's visual foundation and implementation rules.
It is product-owned: provider brands, websites, and component structures are
references, not authorities.

## Table of Contents

1. [Overview](#overview)
2. [Color System](#color-system)
3. [Tailwind Configuration](#tailwind-configuration)
4. [Component Architecture](#component-architecture)
5. [Development Guidelines](#development-guidelines)

## Overview

The design system is implemented through Tailwind theme tokens, shared motion
rules, and feature-owned components. A component stays with the feature that
owns it until genuine reuse justifies promoting it.

### Key Technologies

- **Tailwind CSS v4**: Theme tokens and literal-pixel utilities
- **Motion**: Shared springs, gestures, and layout transitions
- **Custom React components**: Product-specific interface vocabulary

### Current Directory Structure

```
src/
├── features/             # Current product studies and feature-owned behavior
│   ├── lab/              # Interaction studies
│   ├── materials/        # Materials being evaluated for reuse
│   └── playground/       # Composed product studies
├── routes/               # TanStack Router entry points
└── styles/app.css        # Theme tokens and base styles
```

This is the repository as it exists today. The component architecture below
defines where responsibilities live as they become clear.

## Color System

The palette is defined in `src/styles/app.css`. Components consume semantic
tokens rather than local color values.

### Color Categories

#### Heat Colors
The primary brand color with various opacity levels:
- `heat-4` to `heat-100`: Orange/red brand color (#fa5d19) with opacity variants from 4% to 100%

#### Accent Colors
Semantic colors for different UI states and contexts:
- `accent-black`: Dark neutral (#262626)
- `accent-white`: Pure white (#ffffff)
- `accent-amethyst`: Purple accent (#9061ff)
- `accent-bluetron`: Blue accent (#2a6dfb)
- `accent-crimson`: Red accent (#eb3424)
- `accent-forest`: Green accent (#42c366)
- `accent-honey`: Yellow accent (#ecb730)

#### Alpha Variants
Transparent overlays for layering and depth:
- `black-alpha-1` to `black-alpha-88`: Black with opacity from 1% to 88%
- `white-alpha-56` and `white-alpha-72`: White with 56% and 72% opacity

#### UI Colors
Specific colors for interface elements:
- `border-faint`, `border-muted`, `border-loud`: Border color variants
- `illustrations-faint`, `illustrations-muted`, `illustrations-default`: Illustration colors
- `background-lighter`, `background-base`: Background color variants

### Color Usage

Colors are declared as CSS custom properties inside Tailwind's `@theme` block:

```css
@theme {
  --color-heat-100: color(display-p3 0.980392 0.364706 0.098039);
  --color-accent-black: #262626;
  --color-background-base: #f9f9f9;
}
```

Each declaration has two public forms:

- a Tailwind utility, such as `bg-background-base`, `text-accent-black`, or
  `border-border-muted`;
- the CSS custom property itself, such as
  `var(--color-background-base)` or `var(--color-heat-100)`.

This keeps Tailwind components, authored CSS, SVG, canvas, and motion code on the
same palette. A component must not duplicate a token as a local hex, RGB, or P3
value.

```jsx
<div className="bg-heat-100 text-accent-white">
  Primary brand styling
</div>

<div className="border border-border-muted bg-background-base">
  Subtle interface element
</div>
```

## Tailwind Configuration

Tailwind v4 reads the theme directly from `src/styles/app.css`. The theme defines
semantic typography, literal-pixel spacing, colors, and radii.

### Typography Scale

The design system includes a comprehensive typography scale with semantic naming:

#### Titles
- `title-h1`: 60px, line-height 64px, letter-spacing -0.3px
- `title-h2`: 52px, line-height 56px, letter-spacing -0.52px
- `title-h3`: 40px, line-height 44px, letter-spacing -0.4px
- `title-h4`: 32px, line-height 36px, letter-spacing -0.32px
- `title-h5`: 24px, line-height 32px, letter-spacing -0.24px

#### Body Text
- `body-x-large`: 20px, line-height 28px, letter-spacing -0.1px
- `body-large`: 16px, line-height 24px
- `body-medium`: 14px, line-height 20px, letter-spacing 0.14px
- `body-small`: 13px, line-height 20px
- `body-input`: 15px, line-height 24px

#### Labels
- `label-x-large`: 20px, line-height 28px, font-weight 450
- `label-large`: 16px, line-height 24px, font-weight 450
- `label-medium`: 14px, line-height 20px, font-weight 450
- `label-small`: 13px, line-height 20px, font-weight 450
- `label-x-small`: 12px, line-height 20px, font-weight 450

#### Monospace
- `mono-medium`: 14px, line-height 22px
- `mono-small`: 13px, line-height 20px, font-weight 500
- `mono-x-small`: 12px, line-height 16px

### Font Families

- **Sans**: Switzer (primary), system fallbacks
- **Mono**: Geist Mono, system fallbacks
- **ASCII**: Roboto Mono, system fallbacks

### Custom Utilities

The configuration includes several custom utility classes:

#### Border Utilities
- `.inside-border`: Absolute positioned border overlay
- `.inside-border-x`: Horizontal border overlay
- `.inside-border-y`: Vertical border overlay
- `.mask-border`: CSS mask for border effects

#### Positioning Utilities
- `.center-x`: Horizontal centering
- `.center-y`: Vertical centering
- `.center`: Full centering
- `.flex-center`: Flexbox centering

#### Layout Utilities
- `.overlay`: Full overlay positioning
- `.text-gradient`: Text gradient effects

#### Custom Sizing Utilities
- `cw-{size}`: Centered width positioning
- `ch-{size}`: Centered height positioning
- `cs-{size}`: Centered square sizing
- `cmw-{maxWidth},{padding}`: Centered max-width with padding
- `mw-{maxWidth},{padding}`: Max-width with padding

### Critical: Custom Sizing System

**Numeric values equal literal pixels, not rem units like standard Tailwind.**

#### What This Means

In `src/styles/app.css`, `--spacing: 1px` makes each numeric spacing step one
literal pixel:

```css
@theme {
  --spacing: 1px;
}
```

This affects numeric utilities for multiple CSS properties:
- `spacing` - affects padding (`p-*`), margin (`m-*`), gap (`gap-*`)
- `width` - affects width (`w-*`)
- `height` - affects height (`h-*`)
- `size` - affects the `size-*` utility (width + height shorthand)
- `inset` - affects positioning (`top-*`, `left-*`, etc.)

#### Comparison with Standard Tailwind

| Class | Standard Tailwind | Repository System |
|-------|------------------|------------------|
| `w-3` | 0.75rem (12px) | **3px** |
| `h-8` | 2rem (32px) | **8px** |
| `size-4` | 1rem (16px) | **4px** |
| `p-12` | 3rem (48px) | **12px** |
| `gap-24` | 6rem (96px) | **24px** |

#### What to Use

✅ **For Spacing** (padding, margin, gap):
```tsx
<div className="p-24 gap-16 mb-8">  {/* 24px padding, 16px gap, 8px margin-bottom */}
```

✅ **For Border Radius** (pixel-based):
```tsx
<div className="rounded-8">  {/* 8px border radius */}
<div className="rounded-6">  {/* 6px border radius */}
<div className="rounded-4">  {/* 4px border radius */}
```

✅ **For Border Width** (explicit pixels):
```tsx
<div className="border-1">  {/* 1px border */}
```

❌ **AVOID for Component Heights/Widths**:
```tsx
{/* WRONG - Button will be 9px tall! */}
<Button className="h-9" />

{/* WRONG - Icon will be 4px × 4px! */}
<Icon className="size-4" />
```

#### Working with Components

**Problem:** Many UI components (buttons, icons, inputs, etc.) use `h-*` and `size-*` utilities that expect rem-based values but get pixel values instead.

**Solution:** Use explicit pixel values for heights/widths that should be larger:

```tsx
{/* Instead of size-4 (4px), use explicit values */}
<Icon className="w-16 h-16" />  {/* 16px × 16px icon */}

{/* Or use style prop for non-spacing dimensions */}
<Icon style={{ width: '1rem', height: '1rem' }} />  {/* 16px × 16px */}
```

#### Common Component Fixes

**Input Components:**
```tsx
// ❌ WRONG - Creates 9px tall input
<Input className="h-9 px-3 py-1 rounded-md border text-sm" />

// ✅ CORRECT - Proper 40px tall input
<Input className="h-40 px-12 py-8 rounded-6 border-1 text-body-input" />
```

**Button Components:**
```tsx
// ❌ WRONG - Creates 9px tall button
<Button className="h-9 px-4 gap-2">Click me</Button>

// ✅ CORRECT - Proper 36px tall button
<Button className="h-36 px-16 gap-8">Click me</Button>
```

**Textarea Components:**
```tsx
// ❌ WRONG - Creates tiny 10px padding
<Textarea className="py-10 px-12" />

// ✅ CORRECT - Proper padding
<Textarea className="py-16 px-16" />
```

**Icon Components:**
```tsx
// ❌ WRONG - Creates 4px × 4px icon
<Icon className="size-4" />

// ✅ CORRECT - Proper 16px × 16px icon
<Icon className="w-16 h-16" />
```

#### Migration Guide

When porting components from standard Tailwind or other projects:

1. **Spacing remains the same** - `p-24` = 24px padding ✓
2. **Heights need conversion** - a standard 36px `h-9` becomes `h-36`
3. **Sizes need conversion** - a standard 16px `size-4` becomes `size-16`
4. **Border radius** - Use pixel numbers: `rounded-8` instead of `rounded-lg`
5. **Border width** - Be explicit: `border-1` instead of `border`

#### Typography Exception

Typography uses semantic sizing (NOT affected by this system):
```tsx
<h1 className="text-title-h3">  {/* Uses 40px from typography config */}
<p className="text-body-medium">  {/* Uses 14px from typography config */}
```

### Border Radius System

Border radius uses **pixel-based numeric values** (not standard Tailwind names):

```typescript
// Available: rounded-{0-32} in 1px increments
rounded-0   // 0px
rounded-4   // 4px (small buttons, inputs)
rounded-6   // 6px (cards, modals)
rounded-8   // 8px (large cards, containers)
rounded-16  // 16px (very rounded)
rounded-32  // 32px (maximum rounded)
rounded-full // 999px (perfect circles)
```

**Common Usage:**
- Small UI elements (buttons, badges): `rounded-4`
- Medium components (inputs, small cards): `rounded-6`
- Large components (cards, modals): `rounded-8`
- Circles/pills: `rounded-full`

❌ **Don't use standard Tailwind names:**
```tsx
{/* WRONG - These don't exist in the config */}
<div className="rounded-sm rounded-md rounded-lg rounded-xl" />

{/* CORRECT - Use pixel numbers */}
<div className="rounded-4 rounded-6 rounded-8 rounded-16" />
```

### Opacity System

Custom opacity scale from 0-99 (percentage based):

```typescript
// Available: opacity-{0-99}
opacity-0   // 0% (invisible)
opacity-10  // 10%
opacity-50  // 50% (semi-transparent)
opacity-80  // 80%
opacity-100 // 100% (fully opaque) - use sparingly, prefer opacity-99
```

**Examples:**
```tsx
<div className="opacity-50 hover:opacity-100">Fade in on hover</div>
<div className="bg-black opacity-20">Subtle overlay</div>
```

### Transition System

Custom transition timing and durations:

#### Timing Function (Default)
```css
transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1)
```
All `transition` classes use this easing by default.

#### Transition Durations
Available: `duration-{0-59}` where each number = n × 50ms

```typescript
duration-0   // 0ms (instant)
duration-4   // 200ms (default, quick)
duration-10  // 500ms (moderate)
duration-20  // 1000ms (slow)
duration-40  // 2000ms (very slow)
```

**Examples:**
```tsx
<div className="transition-all duration-4">Quick transition (200ms)</div>
<div className="transition-opacity duration-10">Moderate fade (500ms)</div>
```

### Animations

Custom keyframe animations available:

```tsx
// Accordion animations
animate-accordion-down  // Smooth accordion open
animate-accordion-up    // Smooth accordion close

// Fade animations
animate-fade-in        // Fade in from 0 to 100% opacity
animate-fade-up        // Fade in + slide up 10px

// Special effects
animate-screenshot-scroll  // 15s infinite scroll animation
animate-selection-pulse-green  // Green pulse for selections
animate-button-press   // Button press effect (scale down/up)
```

**Usage:**
```tsx
<div className="animate-fade-in">Fades in on mount</div>
<button className="animate-button-press">Press me</button>
```

### Common Spacing Values

Recommended spacing values for consistency:

#### Micro Spacing (tight layouts)
- `gap-4`, `p-4`, `m-4` = 4px
- `gap-8`, `p-8`, `m-8` = 8px

#### Standard Spacing (most common)
- `gap-12`, `p-12`, `m-12` = 12px
- `gap-16`, `p-16`, `m-16` = 16px
- `gap-24`, `p-24`, `m-24` = 24px

#### Large Spacing (sections, containers)
- `gap-32`, `p-32`, `m-32` = 32px
- `gap-48`, `p-48`, `m-48` = 48px
- `gap-64`, `p-64`, `m-64` = 64px

#### Extra Large (page layouts)
- `gap-80`, `p-80`, `m-80` = 80px
- `gap-96`, `p-96`, `m-96` = 96px
- `gap-128`, `p-128`, `m-128` = 128px

**Fractional Percentages** (also available):
```tsx
w-1/2   // 50%
w-1/3   // 33.3%
w-2/3   // 66.6%
w-1/4   // 25%
w-1/6   // 16.6%
w-5/6   // 83.3%
```

### Responsive Breakpoints

```typescript
screens: {
  xs: { min: "390px" },
  "xs-max": { max: "389px" },
  sm: { min: "576px" },
  "sm-max": { max: "575px" },
  md: { min: "768px" },
  "md-max": { max: "767px" },
  lg: { min: "996px" },
  "lg-max": { max: "995px" },
  xl: { min: "1200px" },
  "xl-max": { max: "1199px" }
}
```

## Component Architecture

The architecture keeps reusable interface mechanics separate from product
meaning. We retain the useful layered structure from our references without
copying their brands, directory names, or library inventory.

### Product structure

Organize stable responsibilities toward this shape:

```
src/
├── components/
│   ├── ui/                # Accessible, domain-neutral controls and surfaces
│   ├── icons/             # Product and utility SVG components
│   ├── motion/            # Reusable gesture, presence, and layout behavior
│   ├── layout/            # Repeated spatial composition primitives
│   └── materials/         # Reusable visual materials and atmosphere
├── features/
│   ├── accommodation/     # Candidate and inspection representations
│   ├── comparison/        # Shortlist, ranking, and comparison behavior
│   ├── outreach/          # Drafting, approval, sending, and replies
│   ├── thread/            # Conversation and generative part rendering
│   ├── workspace/         # Persistent canvas and arranged artifact views
│   ├── lab/               # Rapid interaction exploration
│   └── playground/        # Composed product journeys
├── providers/             # App-level React providers only
├── routes/                # Page composition and navigation
└── styles/app.css         # Global theme tokens and base rules
```

`lab` and `playground` are first-class building surfaces. Prototype freely in
them. As soon as a responsibility becomes clear, place it in the appropriate
product or component layer during the same iteration. Do not wait for a formal
migration phase, and do not create a generic `shared/` dumping ground.

### UI primitives (`src/components/ui/`)

This layer owns accessible, domain-neutral building blocks such as:

- controls: `Button`, `IconButton`, `Input`, `Textarea`, `Checkbox`, `Switch`,
  `Select`;
- disclosure and overlays: `Dialog`, `Sheet`, `Popover`, `Tooltip`, `Accordion`;
- navigation: `Tabs`, `Menu`, `Breadcrumb`;
- feedback: `Toast`, `Progress`, `Badge`, `Skeleton`;
- surfaces: `Card`, `Divider`, `ScrollArea`.

We may adopt a well-built shadcn primitive as a starting point, but the exported
component, tokens, variants, and motion belong to this product. Do not mirror a
third-party registry or install a large component inventory speculatively.

### Icons (`src/components/icons/`)

Product marks and utility icons are typed SVG components with organized exports.
Precision controls never use text glyphs as icons. An icon component owns its
view box and geometry; its consumer owns accessible labeling, color, and size.

### Motion and layout (`src/components/motion/`, `src/components/layout/`)

Reusable mechanics belong here after they appear in more than one product
interaction. Likely responsibilities include:

- presence-driven height and width transitions;
- shared-layout movement between thread and workspace;
- drag surfaces with one-to-one tracking, velocity, and cancellation;
- focus-preserving overlays and media expansion;
- repeated split-pane, dock, rail, and anchored-layer behavior.

These are behaviors, not decorative wrappers. A one-use `AnimatedHeight` or
`CurvyRect` stays with its feature until reuse makes the abstraction honest.

### Materials (`src/components/materials/`)

Materials are reusable visual systems such as `AsciiAtmosphere`, evidence-flow
lines, source activity, or flame treatments. They may render through DOM, SVG,
or canvas, but expose product tokens, intensity, motion state, and
reduced-motion behavior through one typed API. They never encode accommodation
or conversation state directly.

### Product features (`src/features/`)

Feature-owned components live in `src/features/<feature>/`. Keep domain data,
interaction state, and feature-specific renderers together. Promote a primitive
only after multiple features use the same behavior.

The product feature families are:

- `thread/`: messages, composer, streaming parts, tool progress, inline
  artifacts, and the typed renderer registry used by generative UI;
- `workspace/`: persistent artifact arrangement, focused inspection, compare
  surfaces, and reversible thread-to-workspace transitions;
- `accommodation/`: `CandidateTile`, `AccommodationInspect`, `MediaExplorer`,
  `MapScene`, and `RequirementLedger`;
- `comparison/`: shortlist state, `CompareDock`, rankings, contradictions, and
  trade-off views;
- `outreach/`: `OutreachProposal`, `ApprovalGate`, sending state, and replies.

The exploration surfaces are:

- `lab/`: candidate representations, comparison, ranking, evidence freshness,
  shortlist state, and conversation studies;
- `materials/`: reusable visual materials such as ASCII atmosphere;
- `playground/`: composed map and accommodation studies.

### Routes

Route files in `src/routes/` compose feature components and own page-level
navigation. They do not contain reusable product logic.

### Shared primitives

Small primitives may stay inside a feature when their meaning is local. Shared
components must encode a stable visual or behavioral responsibility rather than
exist only to shorten one file.

Use proper SVG components for interface icons. Precision controls never use text
glyphs as icons.

## Development Guidelines

### Component Development

#### File Organization
- Keep feature components in `src/features/<feature>/`
- Keep route composition in `src/routes/`
- Keep global tokens and base styles in `src/styles/app.css`
- Group files by a real responsibility rather than by visual type alone

#### Naming Conventions
- Use PascalCase for component files and exports
- Use kebab-case for directories
- Use descriptive, semantic names

#### Styling Guidelines
- Use Tailwind utility classes for styling
- Leverage design system colors and typography scales
- Use custom utilities for common patterns
- Avoid inline styles and CSS modules

#### Component Structure
```tsx
interface CandidateButtonProps {
  readonly name: string
  readonly onSelect: () => void
}

export function CandidateButton({ name, onSelect }: CandidateButtonProps) {
  return (
    <button
      className="min-h-40 rounded-8 bg-background-lighter px-12 text-label-small"
      onClick={onSelect}
      type="button"
    >
      {name}
    </button>
  )
}
```

### Best Practices

#### Accessibility
- Use semantic HTML elements
- Provide proper ARIA labels and roles
- Maintain keyboard navigation support
- Ensure sufficient color contrast

#### Performance
- Use dynamic imports for large components
- Optimize images and assets
- Keep continuous animation work outside React's render cycle
- Pause ambient animation when it is offscreen or the document is hidden

#### Consistency
- Follow established patterns from existing components
- Use design system tokens consistently
- Maintain consistent spacing and typography
- Follow the established file and folder structure
