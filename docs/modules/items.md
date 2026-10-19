# items

## Purpose

Item detail and inline editing at `/lists/:listId/items/:itemId`, including image, description, fields, stores, Move and Delete. Field definitions come from the types API. Metadata lookup (TMDB for movie and TV, Open Library for books) is offered when creating an item.

## Key files

- `src/features/items/ItemPage.tsx`, `ItemView.tsx`, `ItemHero.tsx`: detail screen and hero.
- `image/ImageDialog.tsx`, `ImageSection.tsx`, `api.ts`, `upload.ts`: image changes.
- `inline/`, `form/draft.ts`: field edits and draft helpers.
- `content/`: description editor and history.
- `types/index.ts`: helpers over the API type definitions (no static registry).
- `TitleLookupField.tsx`, `lookup.ts`: title suggestions and the source-specific ids.
- `NewItemDraft.tsx`, `links.ts`, `api.ts`: inline creation, links and item data.

## Interfaces

- `ItemPage()`, `ItemView({ item })`, `ItemHero`.
- `ImageDialog({ item, onClose, initialFile? })`, `ImageSection({ item, initialFile?, onChanged, onStale })`.
- `useItem`, `useUpdateItem`, `useCreateItem`, `useLookupItem`, `useDeleteItem`, `useMoveItem`.
- `typeDefinition(definitions, key)`, `hasPrice(definition)`, `formatField(field, value)`, `typeRows(definition, metadata)`, `typeName`.
- `TitleLookupField`, `lookupSource(type)`, `lookupAvailable(settings, source)`, `createLookupSelection(type, settings, selection)`.
- `DescriptionField({ itemId, listId })`, `InlineField`, `FieldBlock`.

## Gotchas

- Type fields, labels, types and price support come from `GET /api/v1/types`, not from code; `hasPrice` reads `allows_price` from the definition.
- Book type (F-016) has author, pages, first publication year, ISBN and stores fields, all data-driven like the others.
- Lookup ids: a book sends `source_id` (Open Library), movie and TV send `tmdb_id`. `createLookupSelection` sends only the id the list's type uses.
- There is no "Wrong match?", re-match or refresh UI on an item; lookup suggestions appear only when creating (inline draft and Quick add).
- IMDb is rendered as a link tile and streaming keeps its own editor, so neither is a plain field row (`isHiddenTmdbField`, `isStreamingField`).
- The stores field is an editor of ticked provider keys (see [stores](stores.md)); it is never sorted or filtered.
- Pasting an image file while an item's detail page is open opens the image dialog and uploads that file through the normal upload path.
- Image changes are individual requests using the item's `If-Match`; 412/404 keeps the dialog open with a reload action.
- Field editors use the version snapshot captured when opened; a 412 keeps the draft and offers Copy draft and Reload latest.
- Every populated editable field is shown by default; empty fields are available from "+ Add field".
- If lookup is unavailable while the inline draft is created, the draft keeps its typed title and offers retry or creating without metadata.
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for detailed field and image rules.
