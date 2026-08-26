# Design System

This document provides a comprehensive overview of the new design system structure implemented in the Firecrawl web application. The design system is built on top of modern web technologies including Tailwind CSS, shadcn/ui, and custom component libraries.

## Table of Contents

1. [Overview](#overview)
2. [Color System](#color-system)
3. [Tailwind Configuration](#tailwind-configuration)
4. [Component Architecture](#component-architecture)
5. [Brand Assets](#brand-assets)
6. [Development Guidelines](#development-guidelines)

## Overview

The Firecrawl design system is organized around a modular component architecture located in the `components-new/` directory. The system integrates multiple UI libraries and provides a consistent visual language across the application.

### Key Technologies

- **Tailwind CSS**: Utility-first CSS framework with custom configuration
- **shadcn/ui**: High-quality React components built on Radix UI
- **Custom Components**: Application-specific shared components

### Directory Structure

```
components-new/
├── ui/                    # Core UI components
│   ├── shadcn/           # shadcn/ui components
│   ├── magic/            # Magic UI animated components
│   ├── tremor/           # Tremor data visualization components
│   └── motion/           # Motion and animation utilities
├── shared/               # Shared application components
│   ├── icons/            # Icon components and brand assets
│   ├── buttons/          # Custom button components
│   ├── cards/            # Card components
│   ├── effects/          # Visual effects and animations
│   ├── layout/           # Layout utilities
│   └── ui/               # Shared UI utilities
├── app/                  # Application-specific components
│   ├── brand/            # Brand-related components
│   ├── pricing/          # Pricing page components
│   └── (home)/           # Home page components
└── providers/            # Context providers and theme management
```

## Color System

The design system uses a comprehensive color palette defined in `colors.json` and `styles/colors.json`. The color system is designed to provide consistent theming across light and dark modes.

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

Colors are integrated into Tailwind CSS through CSS custom properties:

```typescript
const colors = Object.keys(colorsJson).reduce(
  (acc, key) => {
    acc[key] = `var(--${key})`;
    return acc;
  },
  {} as Record<string, string>
);
```

This allows for dynamic theming and consistent color usage across components:

```jsx
<div className="bg-heat-100 text-accent-white">
  Primary brand styling
</div>

<div className="border border-border-muted bg-background-base">
  Subtle interface element
</div>
```

## Tailwind Configuration

The Tailwind configuration (`tailwind.config.ts`) extends the default theme with custom typography, spacing, and utility classes specifically designed for the Firecrawl design system.

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

- **Sans**: SuisseIntl (primary), system fallbacks
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

### 🚨 Critical: Custom Sizing System

**The Firecrawl design system uses a custom sizing system where numeric values equal literal pixels, NOT rem units like standard Tailwind.**

#### What This Means

In `tailwind.config.ts`, a custom `sizes` object is defined (lines 16-37) that maps numbers to pixel values:

```typescript
const sizes = Array.from({ length: 1000 }, (_, i) => i).reduce(
  (acc, curr) => {
    acc[curr] = `${curr}px`;  // 3 = "3px", 8 = "8px", 100 = "100px"
    return acc;
  },
  { /* fractional percentages */ }
);
```

This `sizes` object is then applied to multiple CSS properties (lines 337-344):
- `spacing` - affects padding (`p-*`), margin (`m-*`), gap (`gap-*`)
- `width` - affects width (`w-*`)
- `height` - affects height (`h-*`)
- `size` - affects the `size-*` utility (width + height shorthand)
- `inset` - affects positioning (`top-*`, `left-*`, etc.)

#### Comparison with Standard Tailwind

| Class | Standard Tailwind | Firecrawl System |
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
2. **Heights need conversion** - `h-9` (36px) → `h-144` (144px) or use style
3. **Sizes need conversion** - `size-4` (16px) → `size-64` (64px) or use style
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

### UI Components (`components-new/ui/`)

The UI layer consists of three main component libraries:

#### shadcn/ui Components
High-quality, accessible React components:
- Form controls: `Button`, `Input`, `Select`, `Checkbox`, `Switch`
- Layout: `Card`, `Sheet`, `Dialog`, `Tabs`, `Accordion`
- Navigation: `NavigationMenu`, `DropdownMenu`, `ContextMenu`
- Feedback: `Toast`, `Alert`, `Progress`, `Badge`
- Data: `Table`, `DataTable`, `Calendar`

#### Magic UI Components
Animated and interactive components:
- `animated-shiny-text`: Shimmer text effects
- `animated-list`: List animations
- `dot-pattern`: Background patterns
- `dock`: macOS-style dock component
- `ripple`: Ripple effects
- `gradual-spacing`: Text spacing animations

#### Tremor Components
Data visualization and dashboard components:
- Charts: `LineChart`, `BarChart`, `AreaChart`
- Controls: `Button`, `Badge`, `Dropdown`
- Layout: `Card`, `Calendar`, `DatePicker`
- Progress: `ProgressBar`

### Shared Components (`components-new/shared/`)

#### Icons (`shared/icons/`)
Brand and utility icons with organized exports:

```typescript
// Brand Icons
export { default as SymbolWhite } from './symbol-white';
export { default as SymbolColored } from './symbol-colored';
export { default as WordmarkWhite } from './wordmark-white';
export { default as WordmarkColored } from './wordmark-colored';

// Utility Icons
export { default as AnimatedLogo } from './animated-logo';
export { default as Check } from './check';
export { default as GitHub } from './github';
```

#### Buttons (`shared/buttons/`)
Custom button components with brand styling:

```typescript
export { SlateButton } from './slate-button';
export { HeatButton } from './heat-button';
export { FireActionLink } from './fire-action-link';
```

#### Layout Components
- `curvy-rect`: Curved rectangle shapes
- `animated-height`: Height animations
- `animated-width`: Width animations
- `unified-blur-overlay`: Backdrop blur effects

#### Effects and Animations
- `flame/`: Fire animation effects
- `animated-beam`: Connecting beam animations
- `data-sources-beam`: Data flow visualizations

### Application Components (`components-new/app/`)

#### Brand Components (`app/brand/`)
Components specific to brand presentation:

- `brand-hero.tsx`: Brand page hero section
- `brand-assets-copy.tsx`: Asset copying functionality
- `brand-assets-download.tsx`: Asset download functionality
- `brand-group.tsx`: Brand asset grouping
- `firecrawl-logo.tsx`: Logo component variants
- `firecrawl-wordmark.tsx`: Wordmark components

Example brand hero component:

```tsx
export default function BrandHero() {
  return (
    <section className='max-w-[1112px] mx-auto -mt-1'>
      <SectionHead
        action={(
          <a className="contents" href="/brand/brand-assets.zip" download>
            <Button className='mx-auto' size='large' variant='primary'>
              Download brand assets
            </Button>
          </a>
        )}
        description="Welcome to the Firecrawl brand hub..."
        title={<><span className="text-heat-100">Firecrawl </span> Brand Assets</>}
        titleClassName='text-title-h3'
      >
        <DeveloperFlame />
      </SectionHead>
    </section>
  );
}
```

## Brand Assets

### Asset Organization (`public/brand/`)

The brand assets are organized in the `public/brand/` directory with comprehensive logo and marketing materials:

#### Logo Variants
- `firecrawl-logo.svg/png`: Primary logo
- `firecrawl-light-logo.svg/png`: Light theme variant
- `firecrawl-wordmark.svg/png`: Text-only wordmark
- `firecrawl-light-wordmark.svg/png`: Light wordmark variant
- `firecrawl-icon.png`: App icon
- `firecrawl-app-icon.png`: Application icon variant

#### Special Assets
- `firecrawl-logo-transparent.png`: Transparent background logo
- `firecrawl-logo-with-fire.png`: Logo with fire element
- `logo_fire.png`: Fire element standalone

#### Marketing Materials
- `scrape-data-from-any-site--firecrawl.jpg`
- `turn-websites-into-llm-ready-data--firecrawl.jpg`
- `we-handle-all-the-hard-stuff--firecrawl.jpg`
- `trusted-by-devs-at-top-companies--firecrawl.jpg`

#### Asset Distribution
- `brand-assets.zip`: Complete brand asset package for download

### Brand Usage Guidelines

#### Logo Usage
- Use `firecrawl-logo.svg` for primary brand representation
- Use `firecrawl-light-logo.svg` on dark backgrounds
- Use `firecrawl-wordmark.svg` when space is constrained
- Maintain proper spacing and sizing ratios

#### Color Usage
- Primary brand color: `heat-100` (#fa5d19)
- Use accent colors sparingly for highlights and CTAs
- Maintain sufficient contrast ratios for accessibility

## Development Guidelines

### Component Development

#### File Organization
- Place reusable components in `shared/`
- Place page-specific components in `app/`
- Use index files for clean imports
- Group related components in subdirectories

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
// Import statements
import { ComponentProps } from 'react';
import { Button } from '@/components/ui/shadcn/button';

// Type definitions
interface MyComponentProps {
  title: string;
  variant?: 'primary' | 'secondary';
}

// Component implementation
export default function MyComponent({ title, variant = 'primary' }: MyComponentProps) {
  return (
    <div className="bg-background-base border border-border-muted rounded-8">
      <h2 className="text-title-h4 text-heat-100">{title}</h2>
      <Button variant={variant}>Action</Button>
    </div>
  );
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
- Leverage React Server Components when possible
- Minimize client-side JavaScript

#### Consistency
- Follow established patterns from existing components
- Use design system tokens consistently
- Maintain consistent spacing and typography
- Follow the established file and folder structure

### Integration with Existing Systems

The design system is designed to work alongside the existing component structure while providing a migration path to the new system. Components in `components-new/` should be preferred for new development, while existing components can be gradually migrated.

#### Import Patterns
```tsx
// Preferred: Use components-new
import { Button } from '@/components/ui/shadcn/button';
import { HeatButton } from '@/components/shared/buttons';

// Legacy: Existing components (migrate when possible)
import { OldButton } from '@/components/ui/button';
```

This design system provides a solid foundation for building consistent, accessible, and maintainable user interfaces across the Firecrawl application while supporting both current needs and future growth.
