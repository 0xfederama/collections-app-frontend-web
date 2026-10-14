# items

## Purpose

The item detail at `/lists/:listId/items/:itemId` (view mode): hero image, external links, kind details, Markdown description, and Move / Delete. Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §4. Edit is a disabled placeholder until W-08.

## Key files

- `src/features/items/ItemPage.tsx`: route body (lazy via `src/routes/ItemRoute.tsx`); `ListGate`, 404 and error states, redirect when the item's `list_id` differs.
- `src/features/items/api.ts`: `itemKeys`, item and content queries, delete and move mutations.
- `src/features/items/ItemView.tsx`: view layout, top to bottom, plus the Description section.
- `src/features/items/ItemHero.tsx`: original image with lightbox, or fallback tile.
- `src/features/items/ExternalLinks.tsx`, `links.ts`: Google, Reddit, Official site (AT-13).
- `src/features/items/KindSection.tsx`: details grid, IMDb link, streaming with country warning.
- `src/features/items/kinds/`: per-kind field configs, shared with the W-08 form.
- `src/features/items/ItemActions.tsx`, `errors.ts`: Move and Delete dialogs, error classification.
- `src/features/items/ItemSkeleton.tsx`: loading placeholder.
- `src/mocks/devItemDetail.ts`: dev-worker fake of the item, content, delete and move endpoints.

## Interfaces

- `ItemPage()`: default export; route element body. `ItemView({ item })`, `ItemActions({ item })`, `KindSection({ item })`.
- `useItem(itemId)`: `GET /api/v1/items/{id}`.
- `useItemContent(itemId)`: `GET …/content` (empty body when never saved).
- `useDeleteItem()`: `DELETE` with `If-Match` from `item.version`; clears the item's detail and content cache.
- `useMoveItem()`: `POST …/move` with `{ list_id }`; writes the response into the detail cache.
- `itemKeys.detail(id)`, `itemKeys.content(id)`.
- `buildExternalLinks(item)`: Google, Reddit, Official site; official `href` is `null` unless http(s).
- `kindRows(kind, metadata)`, `formatField(field, value)`, `formatTvYears(first, end)`: unset fields are hidden.
- `classifyItemError(error)`: `conflict` (412), `unavailable` (409), `not_found` (404), `network`, `other`.
- `devItemDetailHandlers`: loaded by the dev worker only.

## Gotchas

- Delete and move invalidate the item's list (items and detail), and the tree. Move also invalidates the destination list.
- Move and delete: 412 reloads the item, 404 toasts and returns to the list, 409 asks for another list, network errors keep the dialog open.
- An item whose `list_id` differs from the URL is redirected (replace) to its real list.
- The back link and the panel's close button keep the current `?q=` and `?sort=`.
- `ItemPage` keys its body by `itemId`, so moving between items remounts it.
- The streaming warning compares the item's streaming country with `settings.streaming_country_code`.
- The hero image sends no referrer; if it fails to load, the fallback tile shows.
