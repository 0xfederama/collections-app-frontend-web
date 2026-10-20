# items

## Purpose

Item detail and inline editing at `/lists/:listId/items/:itemId`, including image, description, fields, stores, Move and Delete. Field definitions come from the types API. Metadata lookup is offered when creating an item: TMDB for movie and TV (title picker), Open Library for books (no picker, looked up when the title is committed).

## Key files

- `src/features/items/index.ts`: public face; other features import only from here.
- `ItemPage.tsx`, `ItemView.tsx`, `ItemHero.tsx`, `ItemActions.tsx`: detail screen, hero, Move and Delete.
- `form/`: `draft.ts` (Draft model), `validate.ts`, `patch.ts` (`toFields`, `buildPatch`), `price.ts`, `serverErrors.ts` (422 mapping), `dump.ts` (copy draft).
- `inline/`: `InlineField`, `FieldBlock` ("+ Add field"), `FieldEditor` (✓ / ✕ shell), `editors.tsx`, `controls.tsx`, `PriceInputs.tsx`, `StreamingInputs.tsx`, `StreamingPlatforms.tsx`, `fields.ts`, `guard.tsx`.
- `content/`: `DescriptionView`, `DescriptionEditor` (lazy CodeMirror), `DescriptionField`, `HistoryDrawer`, `api.ts`.
- `image/`: `ImageDialog`, `ImageSection`, `ImageStatus` (busy and status types), `api.ts`, `upload.ts`.
- `types/index.ts`: helpers over the API type definitions (no static registry).
- `TitleLookupField.tsx`, `lookup.ts`, `LookupStatus.tsx`: TMDB suggestions (movie and TV) and the pending line for books.
- `NewItemDraft.tsx`, `api.ts`: inline creation and item data. External links live in [links](links.md).

## Interfaces

- `ItemPage()`, `ItemView({ item })`, `ItemHero`.
- `ImageDialog({ item, onClose, initialFile? })`, `ImageSection({ item, initialFile?, onChanged, onStale })`.
- `useItem`, `useItemContent`, `useUpdateItem`, `useCreateItem`, `useDeleteItem`, `useMoveItem` (`api.ts`).
- `typeDefinition(definitions, key)`, `hasPrice(definition)`, `formatField(field, value)`, `typeRows(definition, metadata)`, `typeName`.
- `createLookupSelection(type, settings, selection)`, `hasSuggestions(type)`, `isBookLookup(type, settings)`, `lookupSource(type)`.
- `DescriptionField({ itemId, listId })`, `InlineField`, `FieldBlock`.

## Gotchas

- Type fields, labels, types and price support come from `GET /api/v1/types`, not from code; `hasPrice` reads `allows_price` from the definition.
- Built-in types (F-018, `api-v0.16.0`): Books, Vehicles, Movies, TV shows, Wishlist. Only Wishlist allows price.
- Lookup ids: movie and TV send `tmdb_id`; a book sends only `lookup: true` (no `source_id`). The server fills the item from the first Open Library result and creates it unchanged if Open Library is slow or fails. While pending (2-5 s) `NewItemDraft` shows a `role="status"` line.
- No re-match or refresh UI on an item; lookup suggestions appear only when creating (inline draft and Quick add).
- `isHiddenTmdbField` and `isStreamingField` keep IMDb and streaming out of plain field rows.
- The stores field is an editor of ticked provider keys (see [stores](stores.md)); it is never sorted or filtered.
- Pasting an image file while an item's detail page is open opens the image dialog and uploads through the normal path.
- Image changes and field editors use the item's `If-Match` (version captured when opened); 412/404 keeps the draft and offers Copy draft and Reload latest.
- Every populated editable field is shown by default; empty fields are available from "+ Add field".
- If lookup is unavailable while the inline draft is created, the draft keeps its typed title and offers retry or creating without metadata.
