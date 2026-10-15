---
name: Collections (web 2.0.0)
description: Frosted Gallery. Frosted chrome floating over image-led content, one indigo accent, light and graphite dark.
colors:
  accent: '#4f46e5'
  accent-hover: '#4338ca'
  accent-dark: '#818cf8'
  accent-dark-hover: '#a5b4fc'
  accent-fg: '#ffffff'
  accent-fg-dark: '#0f0e2e'
  ground: '#edeef1'
  surface: '#ffffff'
  ink: '#1d1d1f'
  ink-muted: '#5c5d66'
  border-strong: '#7f8292'
  graphite-ground: '#121215'
  graphite-surface: '#1a1a1f'
  graphite-raised: '#232329'
  graphite-ink: '#f2f2f5'
  graphite-muted: '#a3a3ae'
  danger: '#b91c1c'
  danger-dark: '#f87171'
  success-text: '#166534'
  warning-text: '#92400e'
typography:
  title-page:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    fontSize: '2rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.025em'
  title-dialog:
    fontFamily: '{typography.title-page.fontFamily}'
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.025em'
  body:
    fontFamily: '{typography.title-page.fontFamily}'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: '-0.006em'
  control:
    fontFamily: '{typography.title-page.fontFamily}'
    fontSize: '0.875rem'
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontFamily: '{typography.title-page.fontFamily}'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: '8px'
  md: '10px'
  lg: '18px'
  xl: '24px'
  full: '9999px'
spacing:
  base: '4px'
  sidebar: '268px'
  sheet: '420px'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-fg}'
    rounded: '{rounded.full}'
    height: '40px'
    padding: '0 16px'
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.full}'
    height: '40px'
  button-danger:
    backgroundColor: '{colors.danger}'
    textColor: '{colors.surface}'
    rounded: '{rounded.full}'
  card:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.lg}'
    padding: '6px'
  chip:
    rounded: '{rounded.full}'
    typography: '{typography.caption}'
    padding: '2px 10px'
  field:
    rounded: '{rounded.md}'
    typography: '{typography.control}'
  detail-sheet:
    rounded: '{rounded.xl}'
    width: '420px'
  sidebar:
    width: '268px'
---

# Design System: Collections (web 2.0.0)

## Overview

**Creative North Star: "The Frosted Gallery"**

A calm, personal collection browser for two people. Images lead; chrome is frosted material floating over the content and recedes. Colour comes only from the single indigo accent and from real images. Apple-inspired depth (hairline, inner highlight, layered soft shadow, blur) without Liquid Glass theatrics. Operate register: standard controls, scannable rows, a clean grid. Light and graphite dark share the same materials.

Confirmed rejections: the flat admin dashboard, flat colour-field styling, per-list colours.

**Key Characteristics:**

- Frosted sidebar, floating pill toolbar, floating detail sheet and dialogs are the only blurred surfaces.
- White cards with a 6px inner inset around the image; neutral fallback tiles where images are missing.
- One accent, used only where something can be acted on.
- System font stack, no web font.
- 150-200ms ease-out; springs only on button press.

## Colors

Cool grey ground, white or graphite surfaces, one restrained indigo. Frontmatter is normative; semantic CSS variables in `src/styles/tokens.css` are the only colour source (Tailwind's default palette is dropped).

### Primary

- **Gallery Indigo** (accent; #4f46e5 light, lifted #818cf8 dark): primary buttons, links and accent text (`accent-text`), focus ring, accent chip, the sidebar New item button. Hover steps to accent-hover. Text on it is white in light, deep indigo #0f0e2e in dark.

### Neutral

- **Cool Gallery Grey** (#edeef1): page ground, with a faint ambient gradient (indigo glow top right, sky glow bottom left; stronger indigo in dark).
- **Paper White** (#ffffff): cards, secondary buttons, menus (light `surface` and `surface-raised`).
- **Graphite** (#121215 ground, #1a1a1f surface, #232329 raised): dark theme.
- **Ink** (#1d1d1f) and **Quiet Ink** (#5c5d66); dark: #f2f2f5 and #a3a3ae.
- **Fill** (translucent ink at 5.5% / 10% hover; white 7% / 12% in dark): field backgrounds, segmented tracks, fallback tiles.
- **Hairline** (border at 14% ink; 12% white in dark) for dividers; **Control Edge** (#7f8292 light, #7d7e8c dark) for input borders.
- Status (success, warning, danger) each have bg, border and text tokens per theme; used for chips, banners and the solid danger button (#b91c1c light, #f87171 dark).

### Named Rules

**The Acting-Accent Rule.** Indigo marks what can be acted on or focused. It never decorates.
**The Image-Colour Rule.** Apart from the accent, hue comes from real images; missing images get neutral fill tiles (kind icon plus initial), never a colour per list.
**The Semantic-Only Rule.** Components use semantic tokens (`bg-surface`, `text-text-muted`, `border-border`); no raw hex or Tailwind palette in components.

## Typography

**Font:** the system stack (-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, Segoe UI, Roboto, Helvetica Neue, Arial). Single family for display and body; no web font.

**Character:** native and quiet; hierarchy comes from weight and tight tracking, not from a display face.

### Hierarchy

- **Page title** (700, 2rem, 1.2): list heading, with the kind chip and count beside it.
- **Dialog title** (600, 1.25rem, 1.2, tracking -0.025em).
- **Body** (400, 1rem, 1.5, tracking -0.006em).
- **Control** (500, 0.875rem): buttons, fields, menus, segmented options.
- **Caption** (500, 0.75rem): chips, counts, key hints.
- Scale in use: xs 0.75, sm 0.875, base 1, lg 1.125, xl 1.25, 2xl 1.5, 3xl 2, 4xl 2.5rem. Sidebar brand name is 15px semibold.

### Named Rules

**The Tabular-Numbers Rule.** Prices and counts use tabular figures (`.tabular`).

## Layout

Desktop is three columns: resizable frosted sidebar (default 268px, range 220-400), a main column with 24px padding, and a floating 420px detail sheet at 1280px and wider (`m-3.5`, left margin 0). Below 1280 the item is a full page; the shell collapses at 1024 and 768 (breakpoints in `lib/breakpoints.ts`, equal to Tailwind md, lg, xl). Mobile has a frosted top bar and a drawer for navigation.

The list view's grid is 2 columns on phones, 3 at md, then auto-fill with a minimum card of 180px (lg) or 220px (xl); gaps 12px (16px at md). Rows (compact: 6px gap; thumbnail: 8px gap) are the other display modes. Spacing is Tailwind's 4px base. Touch targets grow to 44px under `pointer-coarse`. The floating toolbar sticks to the top of the list at sm and wider and collapses its labels into icons by container width.

## Elevation & Depth

Hybrid: frosted material plus layered shadows. Every shadow starts with a 1px hairline ring, then a tight contact shadow, then a soft long one. Dark theme uses black at higher opacity and an 8% white inner highlight.

### Shadow Vocabulary

- **sm** (`0 0 0 1px hairline, 0 1px 2px rgb(30 30 70 / .14)`): cards and secondary buttons at rest.
- **md** (sm plus `0 10px 24px -16px`): hover on secondary buttons.
- **lg** (`0 4px 10px -4px, 0 22px 44px -14px`): interactive card hover.
- **float** (lg plus inner top highlight): toolbar, menus.
- **sheet** (`0 40px 80px -20px rgb(20 20 40 / .35)` plus highlight): detail sheet, dialogs.
- **accent** (inner top highlight plus `0 6px 14px -4px` indigo at 45%): primary buttons.

### Material

`material` (78% surface, blur 28px, saturate 180%) for sidebar, toolbar and top bar; `material-strong` (90%) for the detail sheet and dialogs. Menus and popovers are solid `surface-raised`. Under `@supports not (backdrop-filter)` and `prefers-reduced-transparency` both become the solid surface and the overlay darkens.

### Named Rules

**The Blur-Budget Rule.** Backdrop blur only on sidebar, toolbar, detail sheet, dialogs and drawer. Never on cards, menus or content.
**The Hairline-First Rule.** Depth always includes the 1px hairline ring so a surface reads on any image behind it.

## Shapes

Soft and rounded, nested. Radii: controls 8px, field and menu parts 10px, cards 18px, sheets, dialogs and drawer 24px, pills and buttons fully round. Cards inset the image by 6px with a concentric inner radius (13px grid image, 12px row thumbnail). Toolbar is a full pill on desktop and a 22px-radius block when it wraps on phones. Images are cropped `object-cover`.

## Components

### Buttons

- **Shape:** full pill, 40px tall (32px small), 44px minimum on touch; medium weight 14px.
- **Primary:** indigo with the accent shadow. **Secondary:** surface with sm shadow, darkens 6% on hover. **Ghost:** transparent, fill on hover. **Danger:** solid red, used for confirmed destructive actions.
- **Press:** scale 0.97 with the spring ease; disabled at 50% opacity; pending shows a spinner and blocks activation.

### Cards (item entry)

White surface, radius 18px, 6px padding around a 4:3 image tile (rows: 56-64px square thumb). The whole card is one link target via a stretched overlay; hover lifts 1px and deepens to lg. Missing images render a fill tile with the kind icon and the title's initial.

### Chips and badges

Pills, 12px medium, tone-tinted (neutral, accent, success, warning, danger) with text always present. The kind chip sits next to the list title.

### Inputs / Fields

10px radius, fill background with a Control Edge border, surface on focus, muted-ink border on hover, danger border when invalid; 2px indigo focus-visible outline with 2px offset everywhere.

### Segmented control

Fill track with 2px padding; the checked option becomes a surface pill-ish segment with text colour; used for display mode in the toolbar.

### Navigation

Frosted sidebar: brand name, search combobox, accent New item button (shows an N key hint), tree of list tiles with counts, Trash and Settings last, theme toggle in the footer. Collapses to an icon rail.

### Detail sheet and dialogs

Strong material, 24px radius, sheet shadow; dialogs are centred, max 512px, with an overlay dim, and animate with a 0.97 scale and fade.

### Service icon

Square tile (radius 10px, fill background, hairline border) with a local WebP favicon, or a monogram when none exists; a small round `$` badge marks paid availability and the accessible name adds ", paid". Rasters live in `src/assets/services/`; provenance, source URLs and dates are in its README.

## Do's and Don'ts

### Do:

- **Do** take colour, radius, shadow and spacing from the tokens in `src/styles/tokens.css`.
- **Do** keep new floating chrome on `material` or `material-strong` with a shadow from the vocabulary, and provide the solid fallback by using the existing utilities.
- **Do** inset images in cards by 6px with a nested radius.
- **Do** pair every state colour with text or an icon.
- **Do** keep motion at 150-200ms ease-out and honour reduced motion.
- **Do** fall back to a neutral fill tile when an image is missing.

### Don't:

- **Don't** add a second accent, per-list colours or decorative gradients on content.
- **Don't** blur cards, menus or list content.
- **Don't** use a web font or hard offset shadows.
- **Don't** hard-code hex or Tailwind palette classes in components.
- **Don't** add raster assets without a README row giving source URL and date.
