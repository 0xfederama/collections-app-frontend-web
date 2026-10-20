# tree

## Purpose

The folder/list tree, its query and index, and folder and list writes including list icon creation and editing.

## Key files

- `index.ts`: public face; `treeKeys` is in `src/data/keys.ts`.
- `api.ts`: tree query, types and index; `treeLookup.ts`: `findNode`, `nameOf`, `isOpenWithin`.
- `SidebarTree.tsx`, `RailTree.tsx`: sidebar and collapsed rail.
- `mutations.ts`: folder/list writes, reorder and icon updates; success calls `invalidateContent`.
- `useTreeMoves.ts`: move actions behind the menus and dialogs.
- `useTreeDialogs.tsx`, `NameDialog.tsx`: create flows and dialogs; `Vanished.tsx` tells a dialog its target is gone.
- `listFolderMemory.ts`: folder a new list goes into (session only).
- `ListIconDialog.tsx`: edit a list mark with a version snapshot.
- `ListActionsMenu.tsx`, `NodeMenu.tsx`: list and node actions.
- `order.ts`, `ListGate.tsx`: ordering rules and list route gate.

## Interfaces

- `useTree()`, `useTreeIndex()`, `createTreeIndex(data)`: tree data and index.
- `useCreateList()`, `useUpdateListIcon()`, `useMoveList()`, `useDeleteList()`, `useReorderSiblings()`: mutations.
- `useTreeDialogs()`: tree actions and dialogs.
- `ListIconDialog({ list, onClose })`: list icon editor.
- `ListActionsMenu({ list })`, `SidebarTree()`, `ListGate({ listId, children })`.

## Gotchas

- Create and icon update send `icon` and `icon_color`; icon update uses the list snapshot's version in `If-Match`.
- "Change icon" is in the sidebar row "…" only (`NodeMenu` `changeIcon`); the list header opens the same dialog from its icon button.
- A 412 on icon update preserves the selected mark and offers Copy draft or Reload latest; reload requires confirmation and refreshes the tree before replacing the snapshot.
- New list icon choice is a compact labelled field beside Name on the same row, including mobile; picker behavior is unchanged. The list mark is rendered by [lists](lists.md) in the sidebar, rail, list header and search results.
- Create/move bodies include `folder_id` (`null` = top level); reorder is within same-kind siblings under one parent.
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for full interaction details.
