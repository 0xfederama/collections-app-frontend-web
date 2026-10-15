# theme

## Purpose

Light, dark and system colour theme plus the design tokens (palette, semantic colours, radii, easing, fonts). Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §11.

## Key files

- `src/styles/tokens.css`: private stone/teal/status palette; semantic tokens for `:root` (light) and `[data-theme='dark']`.
- `src/styles/global.css`: Tailwind `@theme inline` mapping, dark variant, base styles, keyframes, reduced motion.
- `src/lib/theme.ts`: preference read/write and React hook.
- `index.html`: inline bootstrap script that sets `data-theme` before first paint.
- `src/layouts/ThemeToggle.tsx`: sidebar footer control (three options; one cycling button on the icon rail).
- `src/main.tsx`: imports Inter and Fraunces variable fonts.
- `public/favicon.svg`: app icon.

## Interfaces

- `ThemePreference`: `'system' | 'light' | 'dark'`; `ResolvedTheme`: `'light' | 'dark'`.
- `THEME_STORAGE_KEY`: `'collection:theme'`.
- `getThemePreference(): ThemePreference`: reads storage; invalid or missing values give `'system'`.
- `resolveTheme(pref?): ResolvedTheme`: `system` follows `prefers-color-scheme`.
- `applyTheme(pref?): ResolvedTheme`: sets `document.documentElement.dataset.theme`.
- `setThemePreference(pref)`: persists (`system` removes the key), applies, notifies subscribers.
- `useThemePreference(): { preference, resolved, setPreference }`: follows system and `storage` events.
- `ThemeToggle({ rail? })`: the sidebar footer control; the rail cycles System, Light, Dark.

## Gotchas

- `THEME_STORAGE_KEY` is duplicated in `index.html`; change both together.
- Dark styling keys off `data-theme`, not the media query, so the stored choice overrides the OS.
- Components must use semantic tokens (`bg-surface`, `text-text`, `border-border`); palette vars are private to `tokens.css`.
- Tailwind's default palette, radii and type scale are removed; only the semantic colours, `rounded-*` tokens, and `ease-out` exist.
- `prefers-reduced-motion` collapses animation and transition durations globally in `global.css`.
- Global `:focus-visible` outline uses `--focus-ring`.
