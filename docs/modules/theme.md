# theme

## Purpose

Light, dark and system colour theme, the Editorial design tokens (palette, semantic colours, solid surfaces, radii, shadows, type scale) and the self-hosted fonts. Visual direction: `design-docs/features/F-021-web-restyle.md`; spec: `design-docs/UI_SPEC.md` §11.

## Key files

- `src/styles/tokens.css`: private palette; semantic tokens for `:root` (light) and `[data-theme='dark']`; `--sidebar`, `--border-soft`, `--text-subtle`, `--accent-tint`, ink pair; radius scale; shadow tokens.
- `src/styles/global.css`: Tailwind `@theme inline` mapping, font families, the `text-*` type scale, and the `material`, `material-strong`, `shadow-*` utilities.
- `src/styles/fonts.css`: `@font-face` for Space Grotesk, Geist and Geist Mono (Latin subset, same origin).
- `src/lib/theme.ts`: preference read/write and React hook.
- `index.html`: inline bootstrap script that sets `data-theme` before first paint.
- `src/features/settings/AppearanceSection.tsx`: theme radio group in Settings > Appearance.

## Interfaces

- `ThemePreference`: `'system' | 'light' | 'dark'`; `ResolvedTheme`: `'light' | 'dark'`.
- `THEME_STORAGE_KEY`: `'collection:theme'`.
- `getThemePreference()`, `resolveTheme(pref?)`, `applyTheme(pref?)`: read, resolve and apply; invalid values give `'system'`.
- `setThemePreference(pref)`: persists (`system` removes the key), applies, notifies subscribers.
- `useThemePreference(): { preference, resolved, setPreference }`: follows system and `storage` events.
- `AppearanceSection()`: System default / Light / Dark.
- Utilities: `material` (sidebar tone), `material-strong` (raised layers), `shadow-float`, `shadow-sheet`, `shadow-accent` (none), `bg-fill`, `hover:bg-fill-hover`.
- Type scale: `text-display`, `text-heading`, `text-section`, `text-row`, `text-body`, `text-ui`, `text-secondary`, `text-label` (size, line height, tracking and weight in one class).
- Fonts: `font-display` (Space Grotesk), `font-sans` (Geist), `font-mono` (Geist Mono).

## Gotchas

- `THEME_STORAGE_KEY` is duplicated in `index.html`; change both together.
- Dark styling keys off `data-theme`, not the media query, so the stored choice overrides the OS.
- Fonts are self-hosted from pinned `@fontsource-variable/*` 5.3.0 packages (Latin only). Never load a web font from a CDN; a new family needs a DECISIONS entry.
- Surfaces are solid (no `backdrop-filter`). Shadows are hairline rings plus a soft drop on floating layers only.
- Components use semantic tokens (`bg-surface`, `text-text`, `text-text-subtle`, `border-border-soft`, `bg-ink`); palette vars are private to `tokens.css`.
- Radii: `rounded-sm` 6 px (small tiles), `rounded-md` 8 px (controls), `rounded-lg` 12 px (containers), `rounded-xl` 16 px (sheets, dialogs), `rounded-full` for tags only.
- Tailwind's default palette, radii, shadows and type scale are removed; use the semantic classes above.
- `prefers-reduced-motion` collapses animation and transition durations globally in `global.css`.
- Global `:focus-visible` outline uses `--focus-ring`.
