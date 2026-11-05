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
- `types/index.ts`: helpers over the API type definitions (no static registry); `typeDefinition` returns built-in fields only.
- `TitleLookupField.tsx`, `lookup.ts`, `LookupStatus.tsx`: TMDB suggestions (movie and TV) and the pending line for books.
- `NewItemDraft.tsx`, `api.ts`: inline creation and item data. External links live in [links](links.md).
- `duplicate.ts`: `duplicateTitleMessage(type)`, the inline wording for a 409 `duplicate_title` (F-026 W7).

## Interfaces

- `ItemPage()`, `ItemView({ item })`, `ItemHero`.
- `ImageDialog({ item, onClose, initialFile? })`, `ImageSection({ item, initialFile?, onChanged, onStale })`.
- `useItem`, `useItemContent`, `useUpdateItem`, `useCreateItem`, `useDeleteItem`, `useMoveItem` (`api.ts`); `ItemRef` is the subset they read (list rows have it too).
- `useItemActions(item: ItemRef)` (`ItemActions.tsx`): Move and Delete dialogs, shared by the item page and list rows.
- `typeDefinition(definitions, key)`, `hasPrice(definition)`, `formatField(field, value)`, `typeRows(definition, metadata)`, `typeName`.
- `createLookupSelection(type, settings, selection)`, `hasSuggestions(type)`, `isBookLookup(type, settings)`, `lookupSource(type)`.
- `DescriptionField({ itemId, listId })`, `InlineField`, `FieldBlock`.
- `duplicateTitleMessage(type)` (`duplicate.ts`); `isDuplicateTitle(error)` (`lib/api`) is the shared 409 check.

## Gotchas

- Type fields, labels, types and price support come from `GET /api/v1/types`, not from code; `hasPrice` reads `allows_price` from the definition.
- Custom fields are gone (api-v3.0.0, F-023): every field `GET /api/v1/types` returns is built in, so `typeDefinition` returns it unchanged and no screen sees a custom key.
- Built-in types (F-018, `api-v0.16.0`): Books, Vehicles, Movies, TV shows, Wishlist. Only Wishlist allows price.
- Lookup ids: movie and TV send `tmdb_id`; a book sends only `lookup: true` (no `source_id`). The server fills the item from the first Open Library result and creates it unchanged if Open Library is slow or fails. While pending (2-5 s) `NewItemDraft` shows a `role="status"` line.
- No re-match or refresh UI on an item; lookup suggestions appear only when creating (inline draft and Quick add).
- `isHiddenTmdbField` and `isStreamingField` keep IMDb and streaming out of plain field rows.
- The stores field is an editor of ticked provider keys (see [stores](stores.md)); it is never sorted or filtered.
- The item's streaming row shows only the services in Settings `owned_streaming_services` (`filterOwnedPlatforms`); the streaming editor still lists every service. Empty = all.
- Pasting an image file while an item's detail page is open opens the image dialog and uploads through the normal path.
- Back to the list: on phones it is the back control in the page header slot (`PageHeaderSlot`); 768 to 1279 px keeps the text "← Back to" link; the wide panel has none.
- Phones: after a new item is committed, the draft returns to the list (no auto-open) and a toast's "Open" action opens the item (`NewItemDraft`).
- Image changes and field editors use the item's `If-Match` (version captured when opened); 412/404 keeps the draft and offers Copy draft and Reload latest.
- Every populated editable field is shown by default; empty fields are available from "+ Add field".
- 409 `duplicate_title` (F-026 W7) is shown inline: under the title in the new-item draft (the typed title is kept), on the title of the inline title edit, on the Quick add title, and as the Move message. On movie, TV and book lists the text says "movie", "show" or "book"; other lists say "An item with this title is already in this list."
- The new-item title is 44 px tall (as tall as the ✓ / ✕ buttons). On mount it releases the iOS keyboard proxy (`releaseKeyboardProxy`) that the "New item" tap opened (see [lists](lists.md)).
- If lookup is unavailable while the inline draft is created, the draft keeps its typed title and offers retry or creating without metadata.
