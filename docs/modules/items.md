# items

## Purpose

The item page at `/lists/:listId/items/:itemId`: hero image, links, kind details, description, Move and Delete. Fields, description and image are edited in place (F-002, no edit mode), each with its own save. Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §4–5; redesign: `design-docs/features/F-002-ui-refresh.md`.

## Key files

- `src/features/items/ItemPage.tsx`: route body (lazy via `routes/ItemRoute.tsx`), list gate, 404, list redirect.
- `ItemView.tsx`, `ItemHero.tsx`, `ItemActions.tsx`: sections; hero "Change image"; Move and Delete.
- `ExternalLinks.tsx`, `links.ts`: link row; `buildExternalLinks`, `safeImdbUrl`.
- `inline/`: `InlineField`, `FieldBlock` ("+ Add field"), `editors.tsx`, `fields.ts`, `Banners.tsx`, `guard.tsx`.
- `form/draft.ts`: draft, `buildPatch`, `validate`, `mapServerErrors`, `LIMITS`.
- `content/`: `DescriptionField.tsx`, `HistoryDrawer.tsx`, lazy `MarkdownEditor.tsx`, `api.ts`.
- `image/`: `ImageDialog.tsx`, `ImageSection.tsx`, `api.ts`, `upload.ts`, `checks.ts`, `messages.ts`.
- `kinds/*.ts`: per-kind field configs (contract 0.5.0); `kinds/index.ts`: `kindFields`, `sortKeyLabel`.
- `api.ts`: `itemKeys`, queries, mutations, `recordOwnWrite` / `isOwnWriteChain`.
- `src/mocks/devItemDetail.ts`, `devContent.ts`, `devImages.ts`: dev-worker fakes.

## Interfaces

- `ItemPage()`: default export. `ItemView({ item })`, `ItemActions({ actions })`, `ItemMenu`, `useItemActions(item)`.
- `InlineField`, `FieldBlock`, `EditGuardProvider`, `useEditGuard()`: in-place field editors and the unsaved guard.
- `useItem`, `useItemContent`, `useUpdateItem`, `useCreateItem(listId)`, `useDeleteItem`, `useMoveItem`: `api.ts`.
- `DescriptionField({ itemId, listId })`, `useSaveContent()`, `useRestoreContent()`: `content/`.
- `ImageDialog({ item, onClose })`, `ImageSection({ item, onChanged, onStale })`, `useItemImage(item)`.
- `buildExternalLinks(item)`, `safeImdbUrl(url)`: `links.ts`. `kindFields`, `sortKeyLabel`: `kinds/index.ts`.

## Gotchas

- No `?edit=1`. Open an editor from the value, its pen (hover or focus; always on touch) or Enter; ✓ or Enter saves, ✕ or Esc cancels.
- An editor holds a snapshot; `If-Match` comes from it. 412 keeps the draft (Copy / Reload latest); 404 keeps it for copying.
- The snapshot moves forward only along versions this client wrote (`recordOwnWrite`), so others' changes still 412.
- Each save sends only its field. Kind metadata is replaced whole (D-062); the kind is never sent (it belongs to the list).
- Price is optional: one amount or a min / max range, one currency. Website is `website` (was `official_url`).
- Description saves do not bump the item `version`. Limit 1 MiB; History is disabled while unsaved text is open. Restore sends the current version.
- Unsaved editors block navigation (`useBlocker`) and the unload prompt; changing `?q=` on the same item does not.
- Image changes are not part of any save: each is its own request and toast; the first success closes the dialog. 412 or 404 sets the banner.
- Client image checks (JPEG, PNG, WebP; 10 MiB; `https://` only) are a courtesy; the server stays authoritative.
- Streaming country defaults to `settings.streaming_country_code`. Paid platforms get a `$` badge on their `ServiceIcon`.
- Move lists only the item's kind (`kind_mismatch` 409). Move and Delete: 412 reloads, 404 returns to the list.
- Item PATCH invalidates list items and detail, tree, search and Home recent. Delete removes the item's caches, then `invalidateContent`.
- `ItemPage` keys its body by `itemId`, so moving between items remounts it.
