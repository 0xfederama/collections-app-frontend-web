# items

## Purpose

Item detail and inline editing at `/lists/:listId/items/:itemId`, including image, description, fields, Move and Delete. Field definitions come from the kinds API. TMDB lookup remains available when creating movie and TV items.

## Key files

- `src/features/items/ItemPage.tsx`, `ItemView.tsx`, `ItemHero.tsx`: detail screen and hero.
- `image/ImageDialog.tsx`, `ImageSection.tsx`, `api.ts`, `upload.ts`: image changes.
- `inline/`, `form/draft.ts`: field edits and draft helpers.
- `content/`: description editor and history.
- `kinds/index.ts`: helpers over the API kind definitions (no static registry).
- `api.ts`, `TmdbTitleField.tsx`, `NewItemDraft.tsx`, `links.ts`: item data, TMDB lookup, inline creation and links.

## Interfaces

- `ItemPage()`, `ItemView({ item })`, `ItemHero`.
- `ImageDialog({ item, onClose, initialFile? })`, `ImageSection({ item, initialFile?, onChanged, onStale })`.
- `useItem`, `useUpdateItem`, `useCreateItem`, `useLookupItem`, `useDeleteItem`, `useMoveItem`.
- `kindDefinition(definitions, key)`, `hasPrice(definition)`, `formatField(field, value)`, `kindRows(definition, metadata)`, `kindName`.
- `TmdbTitleField`, `createLookupSelection`.
- `DescriptionField({ itemId, listId })`, `InlineField`, `FieldBlock`.

## Gotchas

- Kind fields, labels, types and price support come from `GET /api/v1/kinds`, not from code; `hasPrice` reads `allows_price` from the definition.
- IMDb is rendered as a link tile and streaming keeps its own editor, so neither is a plain field row (`isHiddenTmdbField`, `isStreamingField`).
- Pasting an image file while an item's detail page is open opens the image dialog and uploads that file through the normal upload path.
- Image changes are individual requests using the item's `If-Match`; 412/404 keeps the dialog open with a reload action.
- Field editors use the version snapshot captured when opened; a 412 keeps the draft and offers Copy draft and Reload latest.
- Every populated editable field is shown by default; empty fields are available from "+ Add field".
- Movie and TV title fields show TMDB suggestions only when lookup is available; choosing one creates the item with the suggested title and TMDB id.
- If TMDB lookup is unavailable while the inline draft is created, the draft keeps its typed title and offers retry or creating without TMDB metadata.
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for detailed field and image rules.
