# items

## Purpose

The item page at `/lists/:listId/items/:itemId`: view mode (hero, external links, kind details, description, Move and Delete) and edit mode (`?edit=1`, a form with If-Match saves, and an Image section that changes the image at once). Also the "Add item" dialog on the list. Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §4 and §5.

## Key files

- `src/features/items/ItemPage.tsx`: route body (lazy via `src/routes/ItemRoute.tsx`); `ListGate`, 404 and error states, redirect when `list_id` differs, view or edit body.
- `src/features/items/editMode.ts`: `?edit=1` helpers (`isEditing`, `withEdit`, `withoutEdit`).
- `src/features/items/ItemEditForm.tsx`: edit form on a snapshot of the item (`base`); save, banners, unsaved guard, Image and Organization sections.
- `src/features/items/form/draft.ts`: pure draft logic (`Draft`, `buildPatch`, `validate`, `mapServerErrors`, `draftDump`, `LIMITS`).
- `src/features/items/form/FormFields.tsx`: `BasicsFields`, `KindFieldsSection` (rendered from `kinds/*.ts`).
- `src/features/items/image/ImageSection.tsx`: drop zone, browse, URL field, Remove, progress and Cancel.
- `src/features/items/image/api.ts`: `useItemImage` (upload, set URL, remove).
- `src/features/items/image/upload.ts`: XHR multipart `PUT` with upload progress.
- `src/features/items/image/checks.ts`, `messages.ts`: client-side file and URL checks; error sentences.
- `src/features/items/CreateItemDialog.tsx`: "Add item" (title and kind), then opens the new item with `?edit=1`.
- `src/features/items/ItemView.tsx`, `ItemHero.tsx`, `KindSection.tsx`, `ExternalLinks.tsx`, `links.ts`: view-mode pieces.
- `src/features/items/ItemActions.tsx`: Edit button, Move and Delete dialogs; `errors.ts` classifies errors.
- `src/features/items/api.ts`: `itemKeys`, item and content queries, create, update, delete and move mutations.
- `src/features/items/kinds/`: per-kind field configs, shared by view and form.
- `src/mocks/devItemDetail.ts`: dev-worker fake of item, content, create, PATCH, delete and move endpoints.
- `src/mocks/devImages.ts`: dev-worker fake of `PUT` and `DELETE /items/{id}/image`.

## Interfaces

- `ItemPage()`: default export. `ItemView({ item })`, `ItemEditForm({ item, listName })`, `ItemActions({ item })`, `MoveItemDialog({ item, onClose })`, `CreateItemDialog({ listId, search, onClose })`.
- `ImageSection({ item, onChanged, onStale })`: `onChanged` gets the updated item; `onStale('conflict' | 'gone')` is raised on 412 or 404.
- `useItemImage(item)`: `upload(file, { onProgress, signal })`, `setUrl(url)` (`PUT` JSON), `remove()` (`DELETE`). `If-Match` from `item.version`; each writes the detail cache and invalidates the list items and list detail.
- `putImageFile({ itemId, version, file, onProgress, signal })`: multipart `PUT /items/{id}/image`; failures become `ApiError` / `NetworkError`.
- `checkImageFile(file)`, `checkImageUrl(value)`: a message or `null`. `describeImageError(error, action)`: `{ message, stale? }`.
- `isEditing(params)`, `withEdit(params)`, `withoutEdit(params)`: `edit` is set and removed with `replace`.
- `useItem(itemId)`, `useItemContent(itemId)`: `GET` item and `GET …/content`.
- `useUpdateItem()`: `PATCH /items/{id}` with `If-Match` from the snapshot's `version`; writes the response to the detail cache.
- `useCreateItem(listId)`: `POST /lists/{id}/items`; seeds the detail cache, invalidates the list items and counts.
- `useDeleteItem()`, `useMoveItem()`: `If-Match` from the loaded item; invalidate list and tree.
- `draftFromItem`, `withKind`, `toFields`, `buildPatch`, `isDirty`, `validate`, `mapServerErrors`, `firstInvalid`, `inputId`, `draftDump`: `form/draft.ts`.
- `classifyItemError(error)`: `conflict` (412), `unavailable` (409), `not_found` (404), `network`, `other`.
- `buildExternalLinks(item)`, `kindRows`, `formatField`: unchanged from view mode.
- `devItemDetailHandlers`, `devImageHandlers`: loaded by the dev worker only.

## Gotchas

- Edit is entered and left with `replace`. Links to other items and the back link drop `edit` (`withoutEdit`); the list's `?q=` and `?sort=` survive.
- A failed background refetch keeps the cached item, so an open draft is never dropped. The load-error screen shows only when there is no cached item.
- Save sends only changed fields. Metadata is replaced as a whole object (D-062), and a kind change always sends `metadata`.
- 412 offers Copy my draft (clipboard, else a fallback dialog) and Reload latest (confirm; the draft is dropped only after the reload succeeds). 404 keeps the draft for copying. 5xx and network errors show Retry. 422 maps to inputs; the first invalid one gets focus, unmatched messages go in a summary. `unknown_field` (400) is a bug on our side and is reported as such.
- Unsaved changes block navigation (`useBlocker`, "Discard changes?") and the browser unload prompt. Staying on the item in edit mode (for example a list filter change) is allowed.
- Move is disabled while the draft is dirty.
- Image changes are not part of Save: each is its own request, applied at once with its own toast. Replace and remove need no confirmation.
- `ItemEditForm` keeps `base` in state. A successful image change moves `base.version`, `image` and `updated_at` forward and leaves the draft alone, so the next Save sends the new `If-Match`.
- 412 or 404 on an image call shows the form's conflict or gone banner; no extra toast.
- Closing the form cancels an upload in flight. Client checks (JPEG, PNG, WebP; 10 MiB; `https://` only) save a round trip; the server stays authoritative.
- Description is a placeholder until W-10.
- Streaming country is a 2-letter text field (no ISO picker yet; W-13 may add one).
- Required labels render as `Title *`; the asterisk is decorative.
- Delete and move invalidate the item's list (items and detail), and the tree. Move also invalidates the destination list.
- Move and delete: 412 reloads the item, 404 toasts and returns to the list, 409 asks for another list, network errors keep the dialog open.
- An item whose `list_id` differs from the URL is redirected (replace) to its real list.
- `ItemPage` keys its body by `itemId`, so moving between items remounts it.
- The streaming warning compares the item's streaming country with `settings.streaming_country_code`.
- The hero image sends no referrer; if it fails to load, the fallback tile shows.
