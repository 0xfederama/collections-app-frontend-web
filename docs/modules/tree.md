# tree

## Purpose

The sidebar folder and list tree: the `GET /api/v1/tree` query and index, expanded state, folder and list writes (create, rename, describe, move, delete, reorder), and the list gate for list routes. Ordering spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §2; write errors: §9.

## Key files

- `src/features/tree/api.ts`: query hooks, `buildTree`, `createTreeIndex`, `treeKeys`.
- `src/features/tree/SidebarTree.tsx`: sidebar tree, its four UI states, mounts the dialogs.
- `src/features/tree/useExpandedFolders.ts`: persisted expanded folder ids.
- `src/features/tree/mutations.ts`: folder and list write hooks, `useReorderSiblings`.
- `src/features/tree/useTreeDialogs.tsx`: all write flows; returns `{ actions, dialogs }`.
- `src/features/tree/NameDialog.tsx`, `DescriptionDialog.tsx`, `MoveDialog.tsx`, `DeleteDialog.tsx`, `FormError.tsx`, `useAction.ts`: dialogs, pending and error state.
- `src/features/tree/DestinationPicker.tsx`: radio list of destinations (Move, trash "Restore to…").
- `src/features/tree/NodeMenu.tsx`, `ListActionsMenu.tsx`, `TreeActionsContext.tsx`: row and list menus, and their context.
- `src/features/tree/slots.tsx`: W-05 slots (header "+" menu, row "More", empty-state buttons).
- `src/features/tree/order.ts`, `errors.ts`: sibling groups, order helpers, error classification.
- `src/features/tree/ListGate.tsx`, `breadcrumbs.ts`: list gate; breadcrumb trail (rendered by the shell).
- `src/features/settings/api.ts`: `useSettings`, `useWorkspaceName`, `settingsKeys`.

## Interfaces

- `useTree()`: query for `/api/v1/tree`, key `treeKeys.tree` (`['tree']`).
- `useTreeIndex()`: `{ status: 'pending' }`, `{ status: 'error', refetch }` or `{ status: 'success', index }`.
- `createTreeIndex(data)`: `nodes`, `folders` and `lists` maps, `ancestorsOf(id)`.
- `SidebarTree()`: provides `TreeActionsContext` and renders the dialogs. `useTreeActions()` throws outside it.
- `useCreateFolder()`, `useCreateList()`, `useRenameFolder()`, `useUpdateList()`, `useMoveFolder()`, `useMoveList()`, `useDeleteFolder()`, `useDeleteList()`: mutations; `If-Match` from `version`; success calls `invalidateContent`.
- `useReorderSiblings()`: `mutate({ kind, parentId, ids })`; optimistic, rolled back on error.
- `useTreeDialogs({ onCreatedFolder? })`: `{ actions: TreeActions, dialogs }`; `TreeActions` has create, rename, editDescription, move, remove, nudge, position, applyMove.
- `DestinationPicker({ options, value, onChange, label? })`: options `{ key, name, depth, reason?, group? }`; `reason` disables an option, `group` is a label with no radio.
- `ListActionsMenu({ list })`: list overflow menu (rename, description, move, delete) with its own dialogs.
- `NodeMenu({ node, actions, name, reorder?, className? })`: row "More" menu.
- `TreeHeaderActions()`, `TreeRowActions({ node })`, `TreeEmptyAction()`: W-05 slots.
- `classifyError(error, noun)`: `conflict`, `cycle`, `unavailable`, `not_found`, `validation`, `network`, `other`.
- `buildSortable`, `applyOrder`, `flattenFolders`, `subtreeCounts`: order helpers in `order.ts`. `subtreeCounts` includes the deleted node itself.
- `useExpandedFolders(index, activeListId)`, `ListGate({ listId, children })`, `useBreadcrumbs()`, `useWorkspaceName()`.

## Gotchas

- Move, reorder and create bodies always send the parent field (`parent_folder_id` / `folder_id`); `null` means root (D-060).
- A 412 keeps the draft and the stale version, and the dialog offers "Reload latest". Success and 404/409 call `invalidateContent`; 412 never does.
- Reorder only moves same-kind siblings under one parent. Cross-parent moves use the Move dialog; "Move up" / "Move down" in the menu are the keyboard fallback.
- A Radix Dialog opened from a menu needs `initialFocus` on `Dialog` (see the ui module).
- The drag handle is a real button labelled `Reorder <name>`, rendered only on sortable rows. Row actions stop click propagation.
- Delete moves to Trash and navigates to `/` when the open list is the deleted node or lives inside it.
- The delete confirm states the same counts as the Trash entry (`countsText`, root included, D-065): "This moves “X” to Trash: 4 folders, 4 lists, 72 items."
- Sub-folders come first in each parent, then lists, each by `(sort_order, id)`. Folders with a missing parent, and anything in a parent cycle, are left out.
- Expanded ids persist under `collection:tree-expanded`; ids of deleted folders are dropped on the next write. Nothing is written before the tree loads.
- When the active list changes, its ancestors open once; a manual collapse sticks until then. Writes go through `invalidateContent` (see [api](api.md)), not per-feature keys.
- The item crumb is always the generic label "Item" (`breadcrumbs.ts`).
