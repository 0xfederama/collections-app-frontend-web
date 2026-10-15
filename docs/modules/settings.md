# settings

## Purpose

`/settings`: a per-device theme choice (applies at once, `localStorage`), the workspace settings form (name, streaming country, default currency, description history limit), and a read-only Connection section (backend status, API address, contract tag, app version). Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §8 and §9.

## Key files

- `src/features/settings/api.ts`: `settingsKeys`, `useSettings`, `useWorkspaceName`, `useUpdateSettings`.
- `src/features/settings/form.ts`: pure draft logic (`validate`, `buildPatch`, `isDirty`, `draftDump`, `FIELD_LABELS`, `inputId`).
- `src/features/settings/SettingsForm.tsx`: form on a snapshot, banners, Copy / Reload dialogs, unsaved guard.
- `src/features/settings/ThemeSection.tsx`: theme `SegmentedControl` backed by `src/lib/theme.ts`.
- `src/features/settings/ConnectionSection.tsx`: Connection section (status from `health`, build-time values).
- `src/routes/SettingsRoute.tsx`: page, loading and error states, section order.
- `vite.config.ts` `define`, `src/build-info.d.ts`: injects `__API_CONTRACT_TAG__` and `__APP_VERSION__`.
- `src/mocks/devSettings.ts`: dev-worker fake of `GET` and `PATCH /api/v1/settings`.

## Interfaces

- `SettingsRoute()`: element of `/settings`.
- `useSettings()`: `GET /api/v1/settings`, cached under `settingsKeys.settings`.
- `useWorkspaceName()`: name for the sidebar; `Collection` while loading or on error.
- `useUpdateSettings()`: `PATCH /api/v1/settings` with `If-Match` from `base.version`; never retried; writes the response to the cache.
- `SettingsForm({ settings })`, `ThemeSection()`, `ConnectionSection()`: the sections of the page.
- `validate`, `buildPatch`, `isDirty`, `draftFromSettings`, `draftDump`: `form.ts`.

## Gotchas

- The form edits a snapshot taken on open; `If-Match` comes from it, so a background refetch never overwrites the draft.
- Save is disabled while the draft equals the stored settings, and after a 412 until the draft is copied or reloaded.
- 412: "Copy my draft" (clipboard, else a fallback dialog) and "Reload latest" (confirm; the draft is dropped only after the refetch succeeds).
- Network and 5xx errors keep the draft and offer Retry. 422 maps to inputs by API field name; the first invalid one gets focus.
- Unsaved changes block navigation (`useBlocker`, "Discard changes?") and the browser unload prompt.
- A successful save updates `settingsKeys.settings`, so the sidebar name and item form defaults follow at once.
- Lowering `markdown_history_limit` deletes nothing immediately; the server prunes each item's extra versions on its next description save.
- Theme is per device (`collection:theme`), not part of the PATCH: no ETag, no Save button, no conflicts.
- Connection shows the page's own origin plus `/api` (D-033); the backend's internal address is never shown.
- Contract tag and app version are baked in at build time, so they change only on rebuild.
