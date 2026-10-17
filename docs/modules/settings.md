# settings

## Purpose

`/settings`: workspace settings, metadata language, immediate trash-retention choice, and read-only Connection and About information.

## Key files

- `src/features/settings/api.ts`: settings query, workspace name and update mutation.
- `form.ts`: draft, validation and patch helpers.
- `SettingsForm.tsx`: snapshot form, retention selector and conflict handling.
- `ConnectionSection.tsx`: readiness and build information.
- `AboutSection.tsx`, `src/assets/tmdb-logo.svg`: TMDB and JustWatch attribution.
- `src/mocks/devSettings.ts`: dev worker fake.

## Interfaces

- `useSettings()`, `useWorkspaceName()`, `useUpdateSettings()`.
- `SettingsForm({ settings })`, `ConnectionSection()`, `AboutSection()`, `SettingsRoute()`.
- `validate`, `buildPatch`, `draftFromSettings`, `draftDump` (`form.ts`).

## Gotchas

- General settings save from a snapshot and send `If-Match`; a 412 keeps the draft and offers Copy draft or confirmed Reload latest.
- Trash retention is a separate immediate update: Off sends `null`; presets are 7, 30 and 90 days. It uses the current settings snapshot version.
- Changing retention changes the automatic deletion policy; it does not immediately purge existing trash. The backend's scheduled job applies retention.
- Network errors keep edits and offer retry; 422 errors map to fields.
- Theme is per device and is not part of the settings PATCH. See [design docs](/Users/federico/Developer/collections-app/design-docs/).
- Metadata language is saved with the workspace settings and controls the language used for TMDB-filled titles and details.
