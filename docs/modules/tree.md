# tree

## Purpose

The folder/list tree, its query and index, and folder and list writes including list icon creation and editing.

## Key files

- `index.ts`: public face; `treeKeys` is in `src/data/keys.ts`.
- `api.ts`: tree query, types and index; `treeLookup.ts`: `findNode`, `nameOf`, `isOpenWithin`.
- `SidebarTree.tsx`, `RailTree.tsx`: sidebar and collapsed rail.
- `mutations.ts`: folder/list writes, reorder and icon updates; success calls `invalidateContent`.
- `treeMoves.ts`: move actions behind the menus and dialogs.
- `useTreeDialogs.tsx`, `NameDialog.tsx`: create flows and dialogs; `Vanished.tsx` tells a dialog its target is gone.
- `listFolderMemory.ts`: folder a new list goes into (session only).
- `ListIconDialog.tsx`: edit a list mark with a version snapshot.
- `ListActionsMenu.tsx`, `NodeMenu.tsx`: list and node actions.
- `useRefreshDetails.ts`, `refreshMessage.ts`: "Refresh details" for movie and TV lists (pure helpers and toast text).
- `order.ts`, `ListGate.tsx`: ordering rules and list route gate.
- `slots.tsx`: sidebar slot content, including the "New" row (`TreeNewButton`).

## Interfaces

- `useTree()`, `useTreeIndex()`, `createTreeIndex(data)`: tree data and index.
- `useCreateList()`, `useUpdateListIcon()`, `useMoveList()`, `useDeleteList()`, `useReorderSiblings()`: mutations.
- `useTreeDialogs()`: tree actions and dialogs.
- `ListIconDialog({ list, onClose })`: list icon editor.
- `ListActionsMenu({ list })`, `SidebarTree()`, `ListGate({ listId, children, slot? })`.
- `useRefreshDetails(listId)` → `{ run, pending }`; `canRefreshDetails(list)`, `refreshSummary(counts)`.

## Gotchas

- Create and icon update send `icon` and `icon_color`; icon update uses the list snapshot's version in `If-Match`.
- "Change icon" is in the sidebar row "…" only (`NodeMenu` `changeIcon`); the list header opens the same dialog from its icon button.
- A 412 on icon update preserves the selected mark and offers Copy draft or Reload latest; reload requires confirmation and refreshes the tree before replacing the snapshot.
- New list icon choice is a compact labelled field beside Name on the same row, including mobile; picker behavior is unchanged. The list mark is rendered by [lists](lists.md) in the sidebar, rail, list header and search results.
- `ListGate` renders its `slot` first in the loading, error and not-found states. With no slot (list pages) it renders `BackToHomeButton`, which only shows on phones; item routes pass a `PageHeaderSlot` back control instead, so a sub-page has one back control (F-026 W5).
- "Refresh details" is in the list header "…" menu only, shown for movie and TV lists with items. It posts `lookup-refresh` (no `If-Match`), shows a "Refreshing details…" toast, then invalidates content. "Run again" (action on the result toast) appears while `remaining` > 0. Covered by `e2e/17-refresh-details.spec.ts`.
- Folder and list names share one text column. The "New" row uses the same 8 px inset, 22 px icon box and gap as a top-level list row; `px-2!` overrides the Button size padding. `e2e/19-tree-new-row.spec.ts` (chromium) checks the alignment.
- Create/move bodies include `folder_id` (`null` = top level); reorder is within same-kind siblings under one parent.
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for full interaction details.
