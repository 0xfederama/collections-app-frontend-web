# items

## Purpose

Item detail and inline editing at `/lists/:listId/items/:itemId`, including image, description, fields, Move and Delete. TMDB lookup remains available when creating movie and TV items.

## Key files

- `src/features/items/ItemPage.tsx`, `ItemView.tsx`, `ItemHero.tsx`: detail screen and hero.
- `image/ImageDialog.tsx`, `ImageSection.tsx`, `api.ts`, `upload.ts`: image changes.
- `inline/`, `form/draft.ts`: field edits and draft helpers.
- `content/`: description editor and history.
- `api.ts`, `TmdbTitleField.tsx`, `NewItemDraft.tsx`, `links.ts`, `kinds/`: item data, TMDB lookup, inline creation, links and kind fields.

## Interfaces

- `ItemPage()`, `ItemView({ item })`, `ItemHero`.
- `ImageDialog({ item, onClose, initialFile? })`, `ImageSection({ item, initialFile?, onChanged, onStale })`.
- `useItem`, `useUpdateItem`, `useCreateItem`, `useLookupItem`, `useDeleteItem`, `useMoveItem`.
- `TmdbTitleField`, `createLookupSelection`.
- `DescriptionField({ itemId, listId })`, `InlineField`, `FieldBlock`.

## Gotchas

- Pasting an image file while an item's detail page is open opens the image dialog and uploads that file through the normal upload path; the same file checks, progress, request version and feedback apply.
- Image changes are individual requests using the item's `If-Match`; 412/404 keeps the dialog open with a reload action.
- Field editors use the version snapshot captured when opened; a 412 keeps the draft and offers Copy draft and Reload latest.
- Simple field editors keep the input immediately beside the row label, with ✓ / ✕ at the input's right on the same row; composite price, years and streaming editors retain their existing layouts.
- Every populated editable field is shown by default; empty fields are available from "+ Add field".
- Movie and TV title fields show TMDB suggestions only when lookup is available; choosing one preserves the typed title and supplies its TMDB id on creation.
- If TMDB lookup is unavailable while the inline movie/TV draft is created, the draft keeps its typed title and offers retrying lookup or creating without TMDB metadata.
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for detailed field and image rules.
