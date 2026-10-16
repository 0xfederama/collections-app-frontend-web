# tree

## Purpose

The sidebar folder and list tree: the `GET /api/v1/tree` query and index, expanded state, folder and list writes (create, rename, move, delete, drag reorder), and the list gate for list routes. Ordering spec: `design-docs/UI_SPEC.md` §2; write errors: §9.

## Key files

- `src/features/tree/api.ts`: query hooks, `createTreeIndex`, `treeKeys`.
- `SidebarTree.tsx`: sidebar tree, its UI states, mounts the dialogs.
- `useExpandedFolders.ts`: persisted expanded folder ids.
- `mutations.ts`: folder and list write hooks, `useReorderSiblings`.
- `useTreeDialogs.tsx`: all write flows; returns `{ actions, dialogs }`.
- `NameDialog.tsx`: create and rename (a kind picker, and a folder picker for a new list, only on create).
- `MoveDialog.tsx`, `DeleteDialog.tsx`, `DestinationPicker.tsx`, `FormError.tsx`, `useAction.ts`: dialogs.
- `NodeMenu.tsx`, `ListActionsMenu.tsx`, `TreeActionsContext.tsx`, `slots.tsx`: row menu, list header menu, "+" menu.
- `order.ts` (sibling order, `canDropInto`), `errors.ts`, `ListGate.tsx`: error classes, list-id gate.

## Interfaces

- `useTree()`: `/api/v1/tree`, key `treeKeys.tree` (`['tree']`). `useTreeIndex()`: `pending`, `error` or `success` with `index`.
- `createTreeIndex(data)`: `nodes`, `folders`, `lists` maps; `ancestorsOf(id)`.
- `SidebarTree()`: provides `TreeActionsContext` and renders the dialogs.
- `useCreateFolder()`, `useCreateList()`, `useRenameFolder()`, `useUpdateList()`, `useMoveFolder()`, `useMoveList()`, `useDeleteFolder()`, `useDeleteList()`: `If-Match` from `version`; success calls `invalidateContent`.
- `useReorderSiblings()`: `mutate({ kind, parentId, ids })`; optimistic, rolled back on error.
- `useTreeDialogs({ onCreatedFolder? })`: `{ actions, dialogs }`; actions: create, rename, move, remove, applyMove.
- `listPathOptions(index)`, `ROOT_KEY`, `destinationKey(id)`, `destinationId(key)` (`MoveDialog.tsx`): the folders a new list can go into, and the top-level key of `DestinationPicker`.
- `ListActionsMenu({ list })`: list header "…" menu (Kind, rename, move, delete) with its own dialogs.
- `useChangeKind(list)` (`useChangeKind.tsx`): `{ pick(kind), dialog }`; the confirm clears item kind fields.
- `canDropInto(index, sourceId, folderId)`: `order.ts`.
- `ListGate({ listId, children })`, `useExpandedFolders`, `useWorkspaceName()`.

## Gotchas

- Create, move and reorder bodies always send the parent field (`parent_folder_id` / `folder_id`); `null` is root (D-060).
- F010-W1: the "New list" dialog also picks the folder (`DestinationPicker` labelled "Folder", the top level first). Default = the opener's folder if the menu said "New list inside X", else the folder the last created list went into, else the top level. That memory is `sessionStorage` (`collection:list-folder`, `null` = top level), written only after a list is really created, and it is a stale id that falls back to the top level. Frontend only: `folder_id` was already part of `POST /lists`. Only lists get the picker; a folder dialog has none.
- A 412 keeps the draft and offers "Reload latest"; success and 404/409 call `invalidateContent`, 412 does not.
- Reorder moves same-kind siblings under one parent only, by dragging the row. Cross-parent moves use the Move dialog.
- A pointer drag (mouse, touch, pen) can also drop a row onto a folder row (`acceptsDrop` = `canDropInto`: not itself, not a descendant, not its current parent). Keyboard drags only reorder.
- A list's kind is set at create and changed from the list header's "…" menu (`useChangeKind`); a rename never changes it.
- List description is edited on the list page, not in the tree.
- Folder rows have no chevron: the folder icon shows open or closed, and selecting the row toggles it.
- A Radix Dialog opened from a menu needs `initialFocus` (see [ui](ui.md)).
- Delete goes to Trash and navigates to `/` when the open list is the deleted node or lives inside it. The confirm counts match the Trash entry (`countsText`, root included, D-065).
- Sub-folders come first in each parent, then lists, each by `(sort_order, id)`. Folders with a missing parent, or in a parent cycle, are left out.
- Expanded ids persist under `collection:tree-expanded`; nothing is written before the tree loads.
- When the active list changes, its ancestors open once; a manual collapse sticks until then.
