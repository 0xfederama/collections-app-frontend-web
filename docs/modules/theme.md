# theme

## Purpose

Light, dark and system colour theme, the Frosted Gallery design tokens (palette, semantic colours, fill, radii, frosted material and shadows), and the system font stack. Spec: `design-docs/UI_SPEC.md` §11; visual direction: `design-docs/features/F-002-ui-refresh.md`.

## Key files

- `src/styles/tokens.css`: private palette; semantic tokens for `:root` (light) and `[data-theme='dark']`; material, fill and shadow tokens; fallbacks for no backdrop-filter and reduced transparency.
- `src/styles/global.css`: Tailwind `@theme inline` mapping, `--font-sans` (system stack), and the `material`, `material-strong`, `shadow-float`, `shadow-sheet` utilities.
- `src/lib/theme.ts`: preference read/write and React hook.
- `index.html`: inline bootstrap script that sets `data-theme` before first paint.
- `src/layouts/ThemeToggle.tsx`: sidebar footer control (one cycling button on the icon rail).
- `public/favicon.svg`: app icon.

## Interfaces

- `ThemePreference`: `'system' | 'light' | 'dark'`; `ResolvedTheme`: `'light' | 'dark'`.
- `THEME_STORAGE_KEY`: `'collection:theme'`.
- `getThemePreference()`, `resolveTheme(pref?)`, `applyTheme(pref?)`: read, resolve and apply; invalid values give `'system'`.
- `setThemePreference(pref)`: persists (`system` removes the key), applies, notifies subscribers.
- `useThemePreference(): { preference, resolved, setPreference }`: follows system and `storage` events.
- `ThemeToggle({ rail? })`: the sidebar footer control.
- Utilities: `material`, `material-strong` (frosted surface), `shadow-float`, `shadow-sheet`, `bg-fill`, `hover:bg-fill-hover`.

## Gotchas

- `THEME_STORAGE_KEY` is duplicated in `index.html`; change both together.
- Dark styling keys off `data-theme`, not the media query, so the stored choice overrides the OS.
- Fonts: the system stack in `--font-sans` only; no web fonts are loaded.
- Components use semantic tokens (`bg-surface`, `text-text`, `border-border`, `bg-fill`); palette vars are private to `tokens.css`.
- Materials are frosted only on sidebar, toolbars, sheet, menus, dialogs and drawer; without backdrop-filter, or with reduced transparency, they turn solid.
- Shadows differ per theme, so `shadow-*` are `@utility` rules in `global.css`. Tailwind's default palette, radii and shadows are removed.
- `prefers-reduced-motion` collapses animation and transition durations globally in `global.css`.
- Global `:focus-visible` outline uses `--focus-ring`.
