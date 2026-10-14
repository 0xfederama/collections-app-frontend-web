# items

## Purpose

The item page at `/lists/:listId/items/:itemId`: view mode (hero, external links, kind details, description, Move and Delete) and edit mode (`?edit=1`, a form with If-Match saves). Also the "Add item" dialog on the list. Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §4 and §5.

## Key files

- `src/features/items/ItemPage.tsx`: route body (lazy via `src/routes/ItemRoute.tsx`); `ListGate`, 404 and error states, redirect when `list_id` differs, view or edit body.
- `src/features/items/editMode.ts`: `?edit=1` helpers (`isEditing`, `withEdit`, `withoutEdit`).
- `src/features/items/ItemEditForm.tsx`: edit form on a snapshot of the item; save, banners, unsaved guard, Organization section.
- `src/features/items/form/draft.ts`: pure draft logic (`Draft`, `buildPatch`, `validate`, `mapServerErrors`, `draftDump`, `LIMITS`).
- `src/features/items/form/FormFields.tsx`: `BasicsFields`, `KindFieldsSection` (rendered from `kinds/*.ts`).
- `src/features/items/CreateItemDialog.tsx`: "Add item" (title and kind), then opens the new item with `?edit=1`.
- `src/features/items/ItemView.tsx`, `ItemHero.tsx`, `KindSection.tsx`, `ExternalLinks.tsx`, `links.ts`: view-mode pieces.
- `src/features/items/ItemActions.tsx`: Edit button, Move (`MoveItemDialog`) and Delete dialogs; `errors.ts` classifies errors.
- `src/features/items/api.ts`: `itemKeys`, item and content queries, create, update, delete and move mutations.
- `src/features/items/kinds/`: per-kind field configs, shared by view and form.
- `src/mocks/devItemDetail.ts`: dev-worker fake of item, content, create, PATCH, delete and move endpoints.

## Interfaces

- `ItemPage()`: default export. `ItemView({ item })`, `ItemEditForm({ item, listName })`, `ItemActions({ item })`, `MoveItemDialog({ item, onClose })`, `CreateItemDialog({ listId, search, onClose })`.
- `isEditing(params)`, `withEdit(params)`, `withoutEdit(params)`: `edit` is set and removed with `replace`.
- `useItem(itemId)`, `useItemContent(itemId)`: `GET` item and `GET …/content`.
- `useUpdateItem()`: `PATCH /items/{id}` with `If-Match` from the snapshot's `version`; writes the response to the detail cache.
- `useCreateItem(listId)`: `POST /lists/{id}/items`; seeds the detail cache, invalidates the list items and counts.
- `useDeleteItem()`, `useMoveItem()`: `If-Match` from the loaded item; invalidate list and tree.
- `draftFromItem`, `withKind`, `toFields`, `buildPatch`, `isDirty`, `validate`, `mapServerErrors`, `firstInvalid`, `inputId`, `draftDump`: `form/draft.ts`.
- `classifyItemError(error)`: `conflict` (412), `unavailable` (409), `not_found` (404), `network`, `other`.
- `buildExternalLinks(item)`, `kindRows`, `formatField`: unchanged from view mode.
- `devItemDetailHandlers`: loaded by the dev worker only.

## Gotchas

- Edit is entered and left with `replace`. Links to other items and the back link drop `edit` (`withoutEdit`); the list's `?q=` and `?sort=` survive.
- A failed background refetch keeps the cached item, so an open draft is never dropped. The load-error screen shows only when there is no cached item.
- Save sends only changed fields. Metadata is replaced as a whole object (D-062), and a kind change always sends `metadata`.
- 412 offers Copy my draft (clipboard, else a fallback dialog) and Reload latest (confirm; the draft is dropped only after the reload succeeds). 404 keeps the draft for copying. 5xx and network errors show Retry. 422 maps to inputs; the first invalid one gets focus, unmatched messages go in a summary. `unknown_field` (400) is a bug on our side and is reported as such.
- Unsaved changes block navigation (`useBlocker`, "Discard changes?") and the browser unload prompt. Staying on the item in edit mode (for example a list filter change) is allowed.
- Move is disabled while the draft is dirty.
- Streaming country is a 2-letter text field (no ISO picker yet; W-13 may add one).
- Required labels render as `Title *`; the asterisk is decorative.
- Image and Description sections are placeholders until W-09 and W-10.
- Delete and move invalidate the item's list (items and detail), and the tree. Move also invalidates the destination list.
- Move and delete: 412 reloads the item, 404 toasts and returns to the list, 409 asks for another list, network errors keep the dialog open.
- An item whose `list_id` differs from the URL is redirected (replace) to its real list.
- `ItemPage` keys its body by `itemId`, so moving between items remounts it.
- The streaming warning compares the item's streaming country with `settings.streaming_country_code`.
- The hero image sends no referrer; if it fails to load, the fallback tile shows.
