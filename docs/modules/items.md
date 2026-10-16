# items

## Purpose

The item page at `/lists/:listId/items/:itemId`: title block, icon-only links, hero image, description, Move and Delete. It is calm by default: kind fields, price and the streaming row appear only when "+ Add field" reveals them. Fields, description and image are edited in place (F-002, no edit mode), each with its own save. New items start as an inline draft at `/lists/:listId/items/new`. Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §4–5; redesign: `design-docs/features/F-002-ui-refresh.md`.

## Key files

- `src/features/items/ItemPage.tsx`: route body (lazy via `routes/ItemRoute.tsx`), list gate, 404, list redirect.
- `ItemView.tsx`, `ItemHero.tsx`, `ItemActions.tsx`: sections; hero "Change image"; Move and Delete.
- `ExternalLinks.tsx`, `links.ts`: icon-only link row; `buildExternalLinks`, `safeImdbUrl`.
- `NewItemDraft.tsx`, `newItem.ts`: inline draft (`NEW_ITEM_ID` = `new`), Enter POSTs, Esc discards.
- `inline/`: `InlineField`, `FieldBlock` ("+ Add field"), `editors.tsx`, `fields.ts`, `Banners.tsx`, `guard.tsx`.
- `form/draft.ts`: draft, `buildPatch`, `validate`, `mapServerErrors`, `LIMITS`.
- `content/`: `DescriptionField.tsx`, `HistoryDrawer.tsx`, lazy `MarkdownEditor.tsx`, `api.ts`.
- `image/`: `ImageDialog.tsx`, `ImageSection.tsx`, `api.ts`, `upload.ts`, `checks.ts`, `messages.ts`.
- `kinds/*.ts`: per-kind field configs (contract 0.5.0); `kinds/index.ts`: `kindFields`, `sortKeyLabel`, `hasPrice` (the single source of truth for which kinds have a price).
- `api.ts`: `itemKeys`, queries, mutations, `recordOwnWrite` / `isOwnWriteChain`.
- `src/mocks/devItemDetail.ts`, `devContent.ts`, `devImages.ts`: dev-worker fakes.

## Interfaces

- `ItemPage()`: default export. `ItemView({ item })`, `ItemActions({ actions })`, `useItemActions(item)`.
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
- The default page is title, image, external links and description only (2026-10-16). Kind fields, price and the streaming row are added with "+ Add field": a field that already has a value is only revealed read-only, an empty one opens its editor, and the choice is local state (gone when the page is left). The menu offers every field of the kind that is not shown yet, set or not.
- Price is one optional field: one amount, or "Add range" for min / max; one currency. Display text is `formatPrice` (see [lists](lists.md)). Only `motorcycle`, `car` and `camera` have a price (`hasPrice`); `generic`, `movie` and `tv_show` offer no price field, like generic items no kind fields at all.
- Website is `website` (was `official_url`) and stays visible by default when set. Links are `TILE_SIZE` (36 px) icon tiles (Google, IMDb, Letterboxd, Reddit, Globe for website; see [ui](ui.md)) with the name as tooltip and sr-only text; an empty website shows a dashed "+" that opens its editor.
- New item: nothing is saved until the title is committed (Enter or ✓), which POSTs and replaces the URL with the item page. Esc, ✕ or a blur with an empty title drops the draft, and unsaved text blocks navigation like an editor.
- Description saves do not bump the item `version`. Limit 1 MiB; History is disabled while unsaved text is open. Restore sends the current version.
- Unsaved editors block navigation (`useBlocker`) and the unload prompt; changing `?q=` on the same item does not.
- Image changes are not part of any save: each is its own request and toast; the first success closes the dialog. 412 or 404 sets the banner.
- Client image checks (JPEG, PNG, WebP; 10 MiB; `https://` only) are a courtesy; the server stays authoritative.
- The streaming heading is exactly `Streaming` (2026-10-16): the country is not repeated (it defaults to `settings.streaming_country_code`) and is named only in the existing mismatch note. Platform icons are centred, and the row's hover bar is taller (`barClassName` on `InlineField`). Paid platforms get a `$` badge on their `ServiceIcon`.
- There is no "…" menu on the item (2026-10-16): `ItemMenu` is gone and Move and Delete live only in the page footer, where `useItemActions` still owns both dialogs and Delete keeps its confirmation. Move lists only the item's kind (`kind_mismatch` 409); both actions: 412 reloads, 404 returns to the list.
- Item PATCH invalidates list items and detail, tree, search and Home recent. Delete removes the item's caches, then `invalidateContent`.
- `ItemPage` keys its body by `itemId`, so moving between items remounts it.
