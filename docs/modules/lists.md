# lists

## Purpose

The list screen at `/lists/:listId`: header (name, kind chip, in-place Markdown description, count), a floating toolbar (display mode, pinned fields, sort, title filter), and the items in the chosen display mode with drag reorder. Spec: `design-docs/UI_SPEC.md` §3; redesign: `design-docs/features/F-002-ui-refresh.md`.

## Key files

- `src/features/lists/ListView.tsx`: URL state (`?q=` debounced, `?sort=` override), display-mode, pinned and default-sort writes.
- `ListHeader.tsx`: header and toolbar; `sortOptionsFor(kind)`; embeds `ListActionsMenu`.
- `ListDescription.tsx`: in-place Markdown description (lazy editor, 64 KiB).
- `KindChip.tsx`: kind chip; changing the kind asks first when items exist.
- `pinned.ts`, `PinnedMenu.tsx`: pinned-field defaults per kind, slot resolution, the "Pinned fields" menu.
- `ItemsView.tsx`, `ItemEntry.tsx`, `ItemThumb.tsx`: states, reorder rules, compact / thumbnail / grid rows.
- `price.ts`: `formatPrice`. `scrollRestore.ts`: scroll restore for `main`.
- `api.ts`: `listKeys`, `useList`, `useListItems`, `useUpdateList`, `useReorderItems`.
- `src/routes/ListRoute.tsx`: route; `ListGate` wraps `ListView`. `src/mocks/devItems.ts`: dev fake.

## Interfaces

- `ListView({ treeList })`, `ListHeader`, `ItemsView`, `ItemEntry`: presentational pieces; props in source.
- `useListItems(listId, { sort, q })`, `flattenItems`, `listKeys`, `ITEMS_PAGE_SIZE` (200).
- `useUpdateList(listId)`: PATCH `display_mode`, `sort_mode` or `pinned_fields` (`null` = kind default); optimistic.
- `useReorderItems(listId)`: PUT of all item ids, optimistic.
- `resolvePinned(list)`, `defaultPinned(kind)`, `pinnableFields(kind)`, `MAX_PINNED_PER_SLOT` (6): `pinned.ts`.
- `formatPrice(price)`: `€1,200–1,500`, `from €…`, `up to €…`, or `null`.
- `useScrollRestore(anchor, ready)`: returns `remember`, called before navigating to an item.

## Gotchas

- Display modes: compact, thumbnail, grid (default). The mode is saved on the list.
- Pinned fields: two slots, `under` and `right`, each up to 6 keys; the kind default applies until the list saves its own (`null` resets).
- Sort options: Manual, Title, Recently updated, Price, and the kind's key (not on generic lists). `?sort=` overrides the saved `sort_mode`; "Make this the default" saves it.
- Drag reorder works on the whole row in Manual sort, with no filter, all items loaded and more than one item; otherwise a hint says why. Keyboard: Space picks up, arrows move.
- Each row has an "Actions for …" menu; the row itself is the drag handle (no grip).
- "Add item" calls Quick add (`useQuickAdd().open(listId)`); there is no per-list create dialog.
- Item links carry the list's query string, so `?q=` and `?sort=` survive opening an item.
- `main` is the scroll container, so `ScrollRestoration` is not used; `scrollRestore.ts` keys by `location.key`.
- The header heading reads the tree, so it follows a rename; `ListView` refetches the list when the tree holds a newer version.
- Description: Click or the pen to edit; ✓ or Ctrl/Cmd+Enter saves, ✕ or Esc cancels. Collapsed state is per device (`collection:list-description-collapsed`).
- A 412 on list update refetches the list with a toast. A 409 `order_stale` on reorder refetches the items; other reorder errors roll back.
