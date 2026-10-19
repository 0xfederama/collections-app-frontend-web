# settings

## Purpose

`/settings` opens as a modal with five panes: Appearance, Collection, Media, Kinds & fields and About (Connection sits under About). Collection and Media save one snapshot on close; Kinds & fields edits the kind definitions through the kinds API.

## Key files

- `src/routes/SettingsRoute.tsx`: dialog, pane switcher and save-before-close flow.
- `src/features/settings/api.ts`: settings and kinds hooks, query keys and ETag helpers.
- `form.ts`, `SettingsForm.tsx`: Collection and Media draft, retention selector and conflicts.
- `KindsFieldsPane.tsx`: kind and field management (create, rename, reorder, delete, defaults).
- `AppearanceSection.tsx`, `ConnectionSection.tsx`, `AboutSection.tsx`: the other panes.
- `src/mocks/devSettings.ts`, `src/mocks/kinds.ts`: dev and test fakes (kinds are read-only).

## Interfaces

- `useSettings()`, `useWorkspaceName()`, `useUpdateSettings()`.
- `useKinds()`, `useCreateKind()`, `useUpdateKind()`, `useDeleteKind()`, `useCreateKindField()`, `useRenameKindField()`, `useDeleteKindField()`, `usePreviewKindFieldDelete()`, `useReorderKindFields()`, `kindKeys`.
- `SettingsRoute()`, `SettingsForm({ settings, pane, onPaneChange, closeRequestRef })`, `KindsFieldsPane()`.
- `validate`, `buildPatch`, `draftFromSettings` (`form.ts`).

## Gotchas

- Collection and Media validate and save from a snapshot (`If-Match: "s-N"`, changed fields only) when the dialog closes; there is no Save button. Errors, 412 conflicts and network failures keep the dialog open with the draft.
- Collection holds workspace name, trash retention and description history; Media holds streaming country and metadata language (saved with the workspace settings). Server 422 errors map to fields.
- Trash retention is a separate immediate update: Off sends `null`; presets are 7, 30 and 90 days. It does not purge existing trash.
- `useKinds()` hides provider bookkeeping (`tmdb_id`, `lookup_disabled`), so they are never editable, pinnable, sortable or filterable.
- Built-in kinds and fields (`is_locked`) are read-only; only custom fields can be renamed, reordered or deleted. Kind and field writes use their own ETags (`"k-N"`, `"kf-N"`).
- Deleting a kind that active lists use lists them by name (from the tree) and asks for a target kind first.
- Every kind or field change invalidates kinds and content, since items and rows render from the definitions.
- Theme is per device and is not part of the settings PATCH. See [design docs](/Users/federico/Developer/collections-app/design-docs/).
