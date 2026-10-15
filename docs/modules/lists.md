# lists

## Purpose

The list screen at `/lists/:listId`: header (title alone, in-place Markdown description, "…" menu with Kind), a floating toolbar (display mode, pinned fields, sort, title filter, item count), and the items in the chosen display mode with drag reorder. Inline new-item draft at `/lists/:listId/items/new`. Spec: `design-docs/UI_SPEC.md` §3; redesign: `design-docs/features/F-002-ui-refresh.md`.

## Key files

- `src/features/lists/ListView.tsx`: URL state (`?q=` debounced, `?sort=` override), display-mode, pinned and default-sort writes.
- `ListHeader.tsx`: title, "New item" (hidden on an empty list), toolbar; `sortOptionsFor(kind)`; embeds `ListActionsMenu`.
- `toolbarStyles.ts`: `toolbarControl` class (36 px, `rounded-md`, fill background).
- `ListDescription.tsx`: in-place Markdown description (lazy editor, 64 KiB).
- `pinned.ts`, `PinnedMenu.tsx`: pinned-field defaults per kind, slot resolution, the "Pinned fields" menu.
- `ItemsView.tsx`, `ItemEntry.tsx`, `ItemThumb.tsx`: states, reorder rules, rows; `ItemThumb` falls back to `ItemInitial` (first letter).
- `price.ts`: `formatPrice`. `scrollRestore.ts`: scroll restore for `main`.
- `api.ts`: `listKeys`, `useList`, `useListItems`, `useUpdateList`, `useReorderItems`.
- `src/routes/ListRoute.tsx`: route; `ListGate` wraps `ListView`. `src/mocks/devItems.ts`: dev fake.

## Interfaces

- `ListView({ treeList })`, `ListHeader`, `ItemsView`, `ItemEntry`: presentational pieces; props in source.
- `useListItems(listId, { sort, q })`, `flattenItems`, `listKeys`, `ITEMS_PAGE_SIZE` (200).
- `useUpdateList(listId)`: PATCH `display_mode`, `sort_mode` or `pinned_fields` (`null` = kind default); optimistic.
- `useReorderItems(listId)`: PUT of all item ids, optimistic.
- `resolvePinned(list)`, `defaultPinned(kind)`, `pinnableFields(kind)`, `MAX_PINNED_PER_SLOT` (6): `pinned.ts`.
- `formatPrice(price)`: `€ 1,200–1,500`, `from € 1,200`, `up to € 1,500` (no cents), or `null`.
- `ItemInitial({ title, className? })`: the no-image tile (first letter, container-query sized).
- `useScrollRestore(anchor, ready)`: returns `remember`, called before navigating to an item.

## Gotchas

- Display modes: compact, thumbnail, grid (default). The mode is saved on the list.
- Pinned fields: two slots, `under` and `right`, each up to 6 keys; the kind default applies until the list saves its own (`null` resets). Generic lists pin nothing and have no pinnable fields.
- Sort options: Manual, Title, Recently updated, Price, and the kind's key. Generic lists have neither Price nor the kind key. `?sort=` overrides the saved `sort_mode`; "Make this the default" saves it.
- Kind is changed from the "…" menu (`ListActionsMenu`, see [tree](tree.md)), not from the header.
- Drag reorder works on the whole row in Manual sort, with no filter, all items loaded and more than one item; otherwise a hint says why. Keyboard: Space picks up, arrows move.
- Each row has an "Actions for …" menu; the row itself is the drag handle (no grip).
- "New item" (header, or the single CTA of an empty list) opens the inline draft row at `/lists/:listId/items/new` (`NewItemDraft`, see [items](items.md)); Quick add is not used here.
- Item links carry the list's query string, so `?q=` and `?sort=` survive opening an item.
- `main` is the scroll container, so `ScrollRestoration` is not used; `scrollRestore.ts` keys by `location.key`.
- The header heading reads the tree, so it follows a rename; `ListView` refetches the list when the tree holds a newer version.
- Description: Click or the pen to edit; ✓ or Ctrl/Cmd+Enter saves, ✕ or Esc cancels. Collapsed state is per device (`collection:list-description-collapsed`).
- A 412 on list update refetches the list with a toast. A 409 `order_stale` on reorder refetches the items; other reorder errors roll back.
