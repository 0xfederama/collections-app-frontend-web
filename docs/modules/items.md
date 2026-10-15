# items

## Purpose

The item page at `/lists/:listId/items/:itemId`: view mode (hero, external links, kind details, description, Move and Delete) and edit mode (`?edit=1`, a form with If-Match saves, an Image section that changes the image at once, and a description editor with its own save). Also the "Add item" dialog on the list. Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §4 and §5.

## Key files

- `src/features/items/ItemPage.tsx`: route body (lazy via `src/routes/ItemRoute.tsx`); `ListGate`, 404 and error states, redirect when `list_id` differs, view or edit body.
- `src/features/items/editMode.ts`: `?edit=1` helpers (`isEditing`, `withEdit`, `withoutEdit`).
- `src/features/items/ItemEditForm.tsx`: edit form on a snapshot of the item (`base`); save, banners, unsaved guard, Image, Description and Organization sections.
- `src/features/items/form/draft.ts`: pure draft logic (`Draft`, `buildPatch`, `validate`, `mapServerErrors`, `draftDump`, `LIMITS`).
- `src/features/items/form/FormFields.tsx`: `BasicsFields`, `KindFieldsSection` (rendered from `kinds/*.ts`).
- `src/features/items/image/ImageSection.tsx`: drop zone, browse, URL field, Remove, progress and Cancel.
- `src/features/items/image/api.ts`: `useItemImage` (upload, set URL, remove).
- `src/features/items/image/upload.ts`: XHR multipart `PUT` with upload progress.
- `src/features/items/image/checks.ts`, `messages.ts`: client-side file and URL checks; error sentences.
- `src/features/items/CreateItemDialog.tsx`: "Add item" (title and kind), then opens the new item with `?edit=1`.
- `src/features/items/ItemView.tsx`, `ItemHero.tsx`, `KindSection.tsx`, `ExternalLinks.tsx`, `links.ts`: view-mode pieces; `ItemView` has the Description History button.
- `src/features/items/ItemActions.tsx`: Edit button, Move and Delete dialogs; `errors.ts` classifies errors.
- `src/features/items/api.ts`: `itemKeys`, item and content queries, create, update, delete and move mutations.
- `src/features/items/kinds/`: per-kind field configs, shared by view and form.
- `src/mocks/devItemDetail.ts`: dev-worker fake of item, content, create, PATCH, delete and move endpoints.
- `src/features/items/content/ContentEditor.tsx`: `ContentSection` (description load) and the editor: Save, conflict and network banners.
- `src/features/items/content/MarkdownEditor.tsx`: CodeMirror 6 source editor (lazy chunk).
- `src/features/items/content/HistoryDrawer.tsx`: version list, preview, restore.
- `src/features/items/content/api.ts`: `contentKeys`, save, restore, versions queries.
- `src/features/items/content/limits.ts`: 1 MiB limit, byte count, `formatBytes`, `relativeTime`.
- `src/mocks/devContent.ts`: dev-worker fake of the content endpoints.
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
- `useCreateItem(listId)`, `useDeleteItem()`, `useMoveItem()`: create seeds the detail cache; delete and move invalidate list and tree.
- `ContentSection({ itemId, listId, onDirtyChange })`: loads the content, then edits a snapshot of it.
- `useSaveContent()`: `PUT /items/{id}/content`, `If-Match: "c-N"` from the snapshot.
- `useRestoreContent()`: `POST …/content/restore`; `If-Match` is the current version, body is the old one.
- `useContentVersions(itemId, enabled)`, `useContentVersion(itemId, version)`: history list and one version (404 when pruned).
- `HistoryDrawer({ open, onOpenChange, itemId, listId, currentVersion, onRestored })`.
- `MarkdownEditor({ value, onChange, label, placeholderText?, id? })`: default export, `lazy()`-loaded.
- `MAX_CONTENT_BYTES`, `byteLength`, `isTooLarge`, `formatBytes`, `relativeTime`: `content/limits.ts`.
- `draftFromItem`, `withKind`, `toFields`, `buildPatch`, `isDirty`, `validate`, `mapServerErrors`, `firstInvalid`, `inputId`, `draftDump`: `form/draft.ts`.
- `classifyItemError(error)`: `conflict` (412), `unavailable` (409), `not_found` (404), `network`, `other`.
- `buildExternalLinks(item)`, `kindRows`, `formatField`: unchanged from view mode.
- `IMDB_URL`, `safeImdbUrl(url)`: `links.ts`; the contract pattern for `imdb_url`, shared with the form's validation.
- `devItemDetailHandlers`, `devImageHandlers`, `devContentHandlers`: loaded by the dev worker only.

## Gotchas

- Edit is entered and left with `replace`. Links to other items and the back link drop `edit` (`withoutEdit`); the list's `?q=` and `?sort=` survive.
- A failed background refetch keeps the cached item, so an open draft is never dropped.
- Save sends only changed fields. Metadata is replaced as a whole object (D-062), and a kind change always sends `metadata`.
- 412 offers Copy my draft (clipboard, else a fallback dialog) and Reload latest (confirm; the draft is dropped only after the reload succeeds). 404 keeps the draft for copying. 5xx and network errors show Retry. 422 maps to inputs; the first invalid one gets focus, unmatched messages go in a summary. `unknown_field` (400) is a bug on our side and is reported as such.
- Unsaved changes block navigation (`useBlocker`, "Discard changes?") and the browser unload prompt. Staying on the item in edit mode (for example a list filter change) is allowed.
- Dirty Basics or description both block navigation and disable Move.
- Image changes are not part of Save: each is its own request, applied at once with its own toast. Replace and remove need no confirmation.
- `ItemEditForm` keeps `base` in state. A successful image change moves `base.version`, `image` and `updated_at` forward and leaves the draft alone, so the next Save sends the new `If-Match`.
- 412 or 404 on an image call shows the form's conflict or gone banner; no extra toast.
- Closing the form cancels an upload in flight. Client checks (JPEG, PNG, WebP; 10 MiB; `https://` only) save a round trip; the server stays authoritative.
- Required labels render as `Title *`; the asterisk is decorative.
- Description saves do not bump the item `version` (checked on the real backend). They refresh the content, versions, detail and list-items caches, never the Basics snapshot.
- Description has its own draft and Save. Saving Basics while the description is dirty stays in edit mode and rebases the Basics draft.
- Description: 1 MiB UTF-8 limit (client check, 413 also shown). 412 offers Copy my draft and Reload latest; 404 (item gone) keeps the text for copying; 5xx and network errors show Retry. An identical save reports "No changes".
- Restore sends the current version in `If-Match` and saves the old body as a new version. A pruned version (404) refreshes the history.
- CodeMirror leaves Tab to the browser (no trap, WCAG 2.1.2).
- Delete and move invalidate the item's list (items and detail), and the tree. Move also invalidates the destination list.
- Move and delete: 412 reloads the item, 404 toasts and returns to the list, 409 asks for another list, network errors keep the dialog open.
- The delete confirm reads "This moves “X” to Trash: 1 item." (same `countsText` wording as the Trash entry).
- An item whose `list_id` differs from the URL is redirected (replace) to its real list.
- `ItemPage` keys its body by `itemId`, so moving between items remounts it.
- The streaming warning compares the item's streaming country with `settings.streaming_country_code`.
- Streaming country and price currency use the ISO pickers (`CountrySelect`, `CurrencySelect`; see ui).
- The hero image sends no referrer; if it fails to load, the fallback tile shows.
- The IMDb link (movie and TV show) renders only when `safeImdbUrl` accepts the stored URL; an invalid one renders nothing.
