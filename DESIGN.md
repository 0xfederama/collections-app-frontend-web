---
name: Collections (web 2.20.0)
description: Editorial. Plain near-white and near-black surfaces, hairline borders, one electric blue accent, a geometric display face and less rounding. Shadows only on floating layers.
colors:
  accent: '#2d5bff'
  accent-hover: '#2a52e8'
  accent-text: '#2448d6'
  accent-tint: '#eef2ff'
  accent-fg: '#ffffff'
  accent-dark: '#4a72ff'
  accent-dark-hover: '#6686ff'
  accent-dark-text: '#8fa8ff'
  accent-dark-fg: '#0b0b0c'
  ink: '#0b0b0c'
  ink-fg: '#ffffff'
  ink-dark: '#f4f4f5'
  ink-dark-fg: '#0b0b0c'
  ground: '#ffffff'
  sidebar: '#f7f7f8'
  surface: '#f6f6f7'
  border: '#e6e6e9'
  border-soft: '#f0f0f1'
  text: '#0b0b0c'
  text-muted: '#55555c'
  text-subtle: '#6e6e78'
  dark-ground: '#0b0b0c'
  dark-sidebar: '#121214'
  dark-surface: '#18181b'
  dark-raised: '#1d1d21'
  dark-border: '#26262b'
  dark-border-soft: '#1d1d21'
  dark-text: '#f4f4f5'
  dark-text-muted: '#a8a8b0'
  dark-text-subtle: '#8a8a93'
  danger: '#b91c1c'
  danger-dark: '#f87171'
typography:
  display:
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif"
    fontSize: 'clamp(2rem, 1.25rem + 3vw, 2.75rem)'
    fontWeight: 700
    lineHeight: 1.02
    letterSpacing: '-0.035em'
  heading:
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif"
    fontSize: '1.875rem'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '-0.03em'
  section:
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif"
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: '-0.015em'
  row:
    fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif"
    fontSize: '0.96875rem'
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: '-0.01em'
  body:
    fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif"
    fontSize: '0.9375rem'
    fontWeight: 400
    lineHeight: 1.6
  ui:
    fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif"
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1.5
  secondary:
    fontFamily: "'Geist', ui-sans-serif, system-ui, sans-serif"
    fontSize: '0.8125rem'
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Geist Mono', ui-monospace, monospace"
    fontSize: '0.75rem'
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: '0.06em'
rounded:
  sm: '6px'
  md: '8px'
  lg: '12px'
  xl: '16px'
  full: '9999px'
spacing:
  base: '4px'
  sidebar: '268px'
  sheet: '420px'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-fg}'
    rounded: '{rounded.md}'
    height: '36px'
    padding: '0 14px'
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
  button-ink:
    backgroundColor: '{colors.ink}'
    textColor: '{colors.ink-fg}'
    rounded: '{rounded.md}'
    height: '36px'
  button-secondary:
    backgroundColor: '{colors.ground}'
    textColor: '{colors.text}'
    rounded: '{rounded.md}'
    height: '36px'
  button-danger:
    backgroundColor: '{colors.danger}'
    textColor: '#ffffff'
    rounded: '{rounded.md}'
  card:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.lg}'
    padding: '6px'
  chip:
    rounded: '{rounded.full}'
    typography: '{typography.secondary}'
    padding: '2px 10px'
  field:
    rounded: '{rounded.md}'
    typography: '{typography.ui}'
  detail-sheet:
    rounded: '{rounded.xl}'
    width: '420px'
  sidebar:
    width: '268px'
---

# Design System: Collections (web 2.20.0)

## Overview

**Direction: "Editorial"** (F-021, `design-docs/features/F-021-web-restyle.md`, approved 2026-10-30). The app reads like a
printed catalogue: a geometric display face for titles, a quiet UI face, near-white and near-black neutrals, one electric
blue and little rounding. Hairline borders do the separating. Shadows appear only on floating layers (menus, popovers,
dialogs, toasts, the detail sheet). Images still lead; chrome stays out of the way.

This replaces the Frosted Gallery (F-002). There is no blur, no gradient and no glow anywhere.

**Key characteristics:**

- Solid surfaces only: the sidebar tone, the page ground and raised layers. No `backdrop-filter`.
- One blue accent for actions, focus and selection. Quick add is the one ink (text-colour) button.
- Two web fonts, self-hosted (OFL, Latin subset): Space Grotesk for display text, Geist for UI and body, Geist Mono for
  numbers and small labels.
- Medium list rows (about 68 px): thumbnail, title with the first pinned field under it, the second pinned field on the
  right in mono.
- Radius scale 6 / 8 / 12 / 16 px, full only for tags.
- 150-200 ms ease-out; springs only on button press; reduced motion respected.

## Colors

Near-white and near-black neutrals with one blue accent. The frontmatter is normative. The semantic CSS variables in
`src/styles/tokens.css` are the only colour source (Tailwind's default palette is dropped in `global.css`).

### Primary

- **Editorial Blue** (`#2d5bff` light, `#4a72ff` dark): primary buttons, focus ring, selection, the workspace accent dot.
  Hover `#2a52e8` (dark `#6686ff`). Link and selected text `#2448d6` (dark `#8fa8ff`). Selected tint `#eef2ff` (dark
  `rgb(74 114 255 / 0.16)`).
- **Ink** (`#0b0b0c` light, `#f4f4f5` dark): the Quick add button only. Its text is the opposite ink.

### Neutral

- **Light:** ground `#ffffff`, sidebar `#f7f7f8`, surface `#f6f6f7`, border `#e6e6e9`, soft divider `#f0f0f1`, text
  `#0b0b0c`, body text `#55555c`, muted text `#6e6e78`.
- **Dark (near-black):** ground `#0b0b0c`, sidebar `#121214`, surface `#18181b`, raised `#1d1d21`, border `#26262b`, soft
  divider `#1d1d21`, text `#f4f4f5`, body text `#a8a8b0`, muted text `#8a8a93`.
- Fills are translucent ink (5% and 9% hover on light; 7% and 12% white on dark), for fields, tracks and fallback tiles.
- Overlays are `rgb(11 11 12 / 0.4)` (light) and `rgb(0 0 0 / 0.6)` (dark).

### Status

Success, warning and danger each have background, border and text tokens per theme. Danger is `#b91c1c` (dark
`#f87171`) for the solid destructive button. Every state colour is paired with text or an icon.

### Named Rules

**The Acting-Accent Rule.** Blue marks what can be acted on or focused. It never decorates.
**The Ink-Action Rule.** Quick add is the only ink button; every other primary action is blue.
**The Semantic-Only Rule.** Components use semantic tokens (`bg-surface`, `text-text-muted`, `border-border`,
`bg-accent-tint`); no raw hex or Tailwind palette in components, and no inline style attributes (CSP).

## Typography

**Families (self-hosted, `src/styles/fonts.css`, Latin subset, `font-display: swap`, never fetched at runtime):**

- **Space Grotesk** (`font-display`): list and item titles, section headings, row titles, the workspace name.
- **Geist** (`font-sans`): all UI and body text, weights 400, 500 and 600.
- **Geist Mono** (`font-mono`): counts, years, pages, prices, keyboard hints and uppercase group labels.

### Scale (utilities in `global.css`, each one carries size, line height, tracking and weight)

- **`text-display`** (Space Grotesk 700, `clamp(2rem, 1.25rem + 3vw, 2.75rem)`, 1.02, -0.035em): list and item title. 32 px at narrow widths, 44 px from 800 px.
- **`text-heading`** (Space Grotesk 700, 30 px, 1.1, -0.03em): page and dialog headings.
- **`text-section`** (Space Grotesk 600, 20 px, 1.3, -0.015em): section headings, such as the item description.
- **`text-row`** (Space Grotesk 600, 15.5 px, 1.35, -0.01em): row titles.
- **`text-body`** (Geist 400, 15 px, 1.6): running text, the description.
- **`text-ui`** (Geist 500, 14 px, 1.5): buttons, fields, menus.
- **`text-secondary`** (Geist, 13 px, 1.5): secondary lines and hints.
- **`text-label`** (Geist Mono, 12 px, 1.4, +0.06em): mono labels; uppercase group labels.

The legacy Tailwind sizes (`text-xs` to `text-4xl`) are removed; the scale above is the only size set.

### Named Rules

**The Tabular-Numbers Rule.** Prices, counts, years and pages are set in Geist Mono (or `.tabular`), so they align.

## Layout

Desktop is three columns: the sidebar (default 268 px, range 220-400) in the sidebar tone with a hairline divider, a main
column with 24 px padding, and a 420 px detail panel at 1280 px and wider. Below 1280 the item is a full page. The shell
collapses at 1024 and 768 px (`lib/breakpoints.ts`, equal to Tailwind `md`, `lg`, `xl`). Mobile uses a menu button and a
drawer for navigation.

The list header has a two-part chip (accent half with the type, tint half with the count, 8 px outer corners), the display
title, the description, then one toolbar row: search, + Filter, sort, Pinned, display mode, New item. The toolbar sticks to
the top of the list.

Spacing is Tailwind's 4 px base. Touch targets are 44 px under `pointer-coarse`; desktop controls may be 36-38 px tall.

## Elevation & Depth

Flat by default. Surfaces are separated by the hairline border. A shadow is only for layers that float above the page
(menus, popovers, dialogs, toasts, the detail sheet). Shadows always start with the 1 px hairline ring.

### Shadow vocabulary

- **sm** (hairline ring only): cards and tiles at rest.
- **md** (hairline plus `0 4px 12px -6px`): hover on floating controls.
- **lg / float** (hairline plus `0 8px 24px -10px`): menus, popovers, toasts, toolbar sheets.
- **sheet** (hairline plus `0 24px 60px -18px`): detail panel, dialogs, drawer.
- **accent**: none. The primary button is flat.

### Surfaces

There is no blur. `material` is the sidebar tone (`--material-bg`); `material-strong` is the raised layer
(`--material-bg-strong`) for dialogs, drawers and the detail panel. Menus and popovers are solid raised surfaces.

### Named Rules

**The No-Blur Rule.** Nothing is frosted, blurred or translucent over content. Use the solid surface utilities.
**The Hairline-First Rule.** Separation comes from the 1 px border first; a shadow only adds lift to a floating layer.

## Shapes

Radii, from `tokens.css` (`--radius-*`):

- **6 px (`rounded-sm`):** small tiles: the row thumbnail, service and link tiles, checkboxes, skeleton rows.
- **8 px (`rounded-md`):** controls: buttons, inputs, selects, menu items, tree rows, tooltips.
- **12 px (`rounded-lg`):** containers: cards, covers, menus, popovers, toasts, toolbars.
- **16 px (`rounded-xl`):** sheets, dialogs and the drawer.
- **Full (`rounded-full`):** tags only: chips, badges, avatars.

Nested shapes stay concentric (inner radius = outer radius minus padding). Images are cropped `object-cover`.

## Components

### Buttons

- **Primary:** blue, 8 px radius. **Ink:** the Quick add button. **Secondary:** bordered on the ground. **Ghost:** transparent
  with fill on hover. **Danger:** solid red, for confirmed destructive actions only.
- **Press:** scale 0.97 with the spring ease. Disabled at 50% opacity. Pending shows a spinner and blocks activation.

### List rows (medium, default)

About 68 px. A 36 x 50 thumbnail (6 px radius, neutral fill with the type icon and initial when the image is missing), 9 px
vertical padding, the title in Space Grotesk 15.5 px with the first pinned field on its own line under it, and the second
pinned field on the right in mono. Compact and gallery modes keep their structure with the same tokens. Hover uses the
fill; the current row is tinted.

### Chips and badges

Full pills, 13 px, with text always present. The type and count chip above the list title is the one two-part exception
(8 px outer corners).

### Inputs / fields

8 px radius, fill background with a border, surface on focus. The border on hover darkens; an invalid field uses the
danger border. Focus is a 2 px blue `focus-visible` ring with a 2 px offset (inset where a scroll container clips it).

### Tree and navigation

Sidebar group labels (folders) are mono uppercase labels (`text-label`, 12 px; the brief said 11 px, the scale token wins). Counts are mono. The current row is tinted with accent text. The
sidebar holds the workspace name (Space Grotesk 19 px bold, with a decorative accent dot after it), search, Quick add, the
tree, Trash and Settings. It collapses to an icon rail.

### Dialogs and the detail panel

Solid raised surface, 16 px radius, sheet shadow. Dialogs are centred with a dim overlay and open with a 0.97 scale and a
fade. The item panel is the same surface, floating at 1280 px and wider.

### Service and link tiles

One icon tile for every link and streaming service: 44 px on the item page (`TILE_SIZE`), 6 px radius, neutral fill and
hairline border, the mark contained in an 18% inset (never cropped). A missing logo is the letter tile. Dark marks use the
light tile. Logos live in `src/assets/services/` with a README row (source, licence, date); the registry is
`src/components/serviceIcons/`.

## Do's and Don'ts

### Do

- **Do** take colour, radius, type, shadow and spacing from the tokens and utilities (`src/styles/tokens.css`,
  `src/styles/global.css`).
- **Do** use the solid surface utilities for floating chrome, with a shadow from the vocabulary.
- **Do** pair every state colour with text or an icon.
- **Do** keep motion at 150-200 ms ease-out and honour reduced motion.
- **Do** use a neutral fill tile when an image is missing.

### Don't

- **Don't** blur, frost or gradient any surface.
- **Don't** add a second accent, per-list colours, or a second ink button.
- **Don't** hard-code hex, Tailwind palette classes, radii or sizes in components.
- **Don't** fetch fonts or icons at runtime, or add a web font outside `fonts.css`.
- **Don't** add raster assets without a README row giving the source URL and date.
