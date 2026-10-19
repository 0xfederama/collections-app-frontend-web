# settings

## Purpose

`/settings` opens as a modal with five panes: Appearance, Collection, Media, Types & fields and About (Connection sits under About). Collection and Media save one snapshot on close; Types & fields edits the type definitions through the types API.

## Key files

- `src/routes/SettingsRoute.tsx`: dialog, pane switcher and save-before-close flow.
- `src/features/settings/api.ts`: settings and types hooks, query keys and ETag helpers.
- `form.ts`, `SettingsForm.tsx`: Collection and Media draft, retention selector and conflicts.
- `TypesFieldsPane.tsx`: type and field management (create, rename, reorder, delete, defaults).
- `AppearanceSection.tsx`, `ConnectionSection.tsx`, `AboutSection.tsx`: the other panes.
- `src/mocks/devSettings.ts`, `src/mocks/types.ts`: dev and test fakes (types are read-only).

## Interfaces

- `useSettings()`, `useWorkspaceName()`, `useUpdateSettings()`.
- `useTypes()`, `useCreateType()`, `useUpdateType()`, `useDeleteType()`, `useCreateTypeField()`, `useRenameTypeField()`, `useDeleteTypeField()`, `usePreviewTypeFieldDelete()`, `useReorderTypeFields()`, `typeKeys`.
- `SettingsRoute()`, `SettingsForm({ settings, pane, onPaneChange, closeRequestRef })`, `TypesFieldsPane()`.
- `validate`, `buildPatch`, `draftFromSettings` (`form.ts`).

## Gotchas

- Collection and Media validate and save from a snapshot (`If-Match: "s-N"`, changed fields only) when the dialog closes; there is no Save button. Errors, 412 conflicts and network failures keep the dialog open with the draft.
- Collection holds workspace name, trash retention and description history; Media holds streaming country, metadata language and a single-choice Default store (`preferred_store`, one provider from the API, saved with the workspace settings). Server 422 errors map to fields.
- Trash retention is a separate immediate update: Off sends `null`; presets are 7, 30 and 90 days. It does not purge existing trash.
- `useTypes()` hides provider bookkeeping (`tmdb_id`, `lookup_disabled`, `openlibrary_id`), so they are never editable, pinnable, sortable or filterable.
- Built-in types and fields (`is_locked`) are read-only; only custom fields can be renamed, reordered or deleted. Type and field writes use their own ETags (`"k-N"`, `"kf-N"`).
- Deleting a type that active lists use lists them by name (from the tree) and asks for a target type first.
- The About pane credits Open Library (metadata source for books).
- Every type or field change invalidates types and content, since items and rows render from the definitions.
- Theme is per device and is not part of the settings PATCH. See [design docs](/Users/federico/Developer/collections-app/design-docs/).
