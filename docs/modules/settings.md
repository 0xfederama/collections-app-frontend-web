# settings

## Purpose

`/settings` opens as a modal with three panes: General (Appearance, Collection), Media and About (Connection sits under About). Collection and Media save one snapshot on close. The Types & fields pane was removed (F-023).

## Key files

- `src/routes/SettingsRoute.tsx`: dialog, pane switcher and save-before-close flow.
- `src/features/settings/index.ts`: public face (`useSettings`, `useTypes`, `useWorkspaceName`); `screens.ts` holds the panes for `SettingsRoute`.
- `src/features/settings/api.ts`: settings and types hooks and ETag helpers; `settingsKeys` and `typeKeys` are in `src/data/keys.ts`.
- `form.ts`: Collection and Media draft, validation, `buildPatch`, `classifySaveFailure`.
- `useSettingsForm.ts`, `useLeaveGuard.ts`: save and close state machine; blocks leaving with unsaved changes.
- `SettingsForm.tsx`, `SettingsBanners.tsx`, `CollectionFields.tsx`, `MediaFields.tsx`: Collection and Media panes and their failure banners.
- `OwnedServicesField.tsx`: Media picker of the owned streaming services (`owned_streaming_services`).
- `AppearanceSection.tsx`, `ConnectionSection.tsx`, `AboutSection.tsx`: the other panes.
- `src/mocks/devSettings.ts`, `src/mocks/types.ts`: dev and test fakes (types are read-only).

## Interfaces

- `useSettings()`, `useWorkspaceName()`, `useUpdateSettings()`.
- `useTypes()` (read only; the field operation hooks are gone).
- `SettingsRoute()`, `SettingsForm({ settings, pane, onPaneChange, closeRequestRef })`.
- `validate`, `buildPatch`, `draftFromSettings` (`form.ts`).

## Gotchas

- Collection and Media validate and save from a snapshot (`If-Match: "s-N"`, changed fields only) when the dialog closes; there is no Save button. Errors, 412 conflicts and network failures keep the dialog open with the draft.
- Collection holds workspace name, trash retention and description history; Media holds streaming country, owned streaming services, metadata language and a single-choice Default store (`preferred_store`, one provider from the API, saved with the workspace settings). Server 422 errors map to fields.
- Trash retention is a separate immediate update: Off sends `null`; presets are 7, 30 and 90 days. It does not purge existing trash.
- `useTypes()` hides provider bookkeeping (`tmdb_id`, `lookup_disabled`, `openlibrary_id`), so they are never editable, pinnable, sortable or filterable.
- Custom fields (`is_locked: false`) are hidden everywhere: `typeDefinition()` in `items/types` returns built-in fields only (F-023). Custom types and the defaults editor were removed earlier (F-022).
- `?pane=types` is no longer a pane and falls back to General.
- Owned streaming services: empty = show every platform; the choice only filters what items and list rows show (see [ui](ui.md)).
- The About pane shows logo tiles for TMDB and Open Library (metadata sources) and has no thank-you line.
- Theme is per device and is not part of the settings PATCH. See [design docs](/Users/federico/Developer/collections-app/design-docs/).
