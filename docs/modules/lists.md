# lists

## Purpose

The list screen at `/lists/:listId`: items in the list's display mode (compact, thumbnail, grid), sort, title filter, drag reorder and fallback tiles. Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §3; sort is D-063 and drag-and-drop is D-061 in `/Users/federico/Developer/collections-app/design-docs/DECISIONS.md`.

## Key files

- `src/features/lists/api.ts`: query keys `listKeys`, `useList`, infinite `useListItems`, `useUpdateList`, `useReorderItems`.
- `src/features/lists/ListView.tsx`: URL state (`?q=` debounced 250 ms, `?sort=` override), display-mode and default-sort writes.
- `src/features/lists/ListHeader.tsx`: name, count, Add item, mode / sort / filter toolbar.
- `src/features/lists/ItemsView.tsx`: empty, error and skeleton states, reorder rules, Load more.
- `src/features/lists/ItemEntry.tsx`: one item as a compact row, thumbnail row or grid card.
- `src/features/lists/ItemThumb.tsx`: cover image or fallback tile.
- `src/features/lists/price.ts`: `formatPrice`.
- `src/features/lists/scrollRestore.ts`: scroll restore for `main`.
- `src/features/lists/sortable.tsx`: the only dnd-kit import in this feature.
- `src/routes/ListRoute.tsx`: route; `ListGate` wraps `ListView`.
- `src/mocks/devItems.ts`: stateful dev fake of list and item endpoints (dev worker only).

## Interfaces

- `ListRoute()`, `ListView({ listId, fallbackName })`: route element of `/lists/:listId`, then the list body below the breadcrumbs.
- `ListHeader`, `ItemsView`, `ItemsSkeleton`, `ItemEntry`, `ItemThumb`: presentational pieces, props in source.
- `useList`, `useListItems(listId, { sort, q })`, `flattenItems`, `listKeys`, `ITEMS_PAGE_SIZE` (200).
- `useUpdateList(listId)`: mutates `{ display_mode }` or `{ sort_mode }` (PATCH, `If-Match` from cache, optimistic).
- `useReorderItems(listId)`: PUT of all item ids, optimistic.
- `formatPrice(price)`: `€1,200–1,500`, `from €…`, `up to €…`, or `null`.
- `useScrollRestore(anchor, ready)`: returns `remember`, to call before navigating to an item.
- `SortableProvider({ onMove })`, `useSortableRow(...)`, `arrayMove(...)`.
- `devItemHandlers` / `createItemsBackend(tree)` (`src/mocks/devItems.ts`): loaded by the dev worker only.

## Gotchas

- Reorder handles show only in manual sort, with no filter, all items loaded and more than one item; otherwise a hint says why.
- `main` is the scroll container, so React Router's `ScrollRestoration` is not used. `scrollRestore.ts` keys by `location.key`, so only back/forward restores.
- Item links carry the list's query string, so `?q=` and `?sort=` survive opening an item.
- "Make this the default sort" saves `sort_mode`, but the `?sort=` override stays in the URL.
- At ≥ 1280 px, closing the detail panel navigates to the bare list URL, so `?q=` and `?sort=` are dropped.
- Add item is a stub toast until W-08. The W-05 `ListActionsMenu` spot in `ListHeader` is marked by a comment.
- A 412 on list update refetches the list and shows a toast. A 409 `order_stale` on reorder refetches the items with a toast; other reorder errors roll back.
