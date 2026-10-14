# tree

## Purpose

The sidebar folder and list tree: the `GET /api/v1/tree` query, its nested index, expanded-folder state, the W-05 extension slots, and the list gate used by list and item routes. Ordering spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §2.

## Key files

- `src/features/tree/api.ts`: `useTree`, `useTreeIndex`, `buildTree`, `createTreeIndex`, `treeKeys`.
- `src/features/tree/SidebarTree.tsx`: sidebar tree with loading, error and empty states.
- `src/features/tree/useExpandedFolders.ts`: persisted expanded folder ids.
- `src/features/tree/slots.tsx`: W-05 extension points (render nothing yet).
- `src/features/tree/ListGate.tsx`: resolves a list id for `/lists/:listId` routes.
- `src/features/tree/breadcrumbs.ts`: breadcrumb trail, rendered by the shell.
- `src/features/settings/api.ts`: `useSettings`, `useWorkspaceName`, `settingsKeys`.

## Interfaces

- `useTree()`: query for `/api/v1/tree`, key `treeKeys.tree` (`['tree']`).
- `useTreeIndex()`: `{ status: 'pending' }`, `{ status: 'error', refetch }` or `{ status: 'success', index }`.
- `buildTree(folders, lists): TreeNode[]`: nests by `parent_folder_id` / `folder_id`.
- `createTreeIndex(data): TreeIndex`: `nodes`, `folders` and `lists` maps, `ancestorsOf(id)` (root first; unknown id gives `[]`).
- `SidebarTree()`: the tree; folder rows toggle, list rows navigate to `/lists/:id`.
- `useExpandedFolders(index, activeListId): [Set<string>, setExpanded]`.
- `ListGate({ listId, children(list, ancestors) })`: skeleton while pending, Retry on error, "List not found" for unknown ids.
- `useBreadcrumbs(): BreadcrumbItem[]`.
- `TreeHeaderActions()`, `TreeRowActions({ node })`, `TreeEmptyAction()`: W-05 slots, all render `null`.
- `useWorkspaceName(): string`: `workspace_name`, or `'Collection'` while loading or on error.

## Gotchas

- Inside each parent, sub-folders come first, then lists, each by `(sort_order, id)`. Folders whose parent is missing, and anything in a parent cycle, are left out.
- Expanded ids persist as an array under `collection:tree-expanded`. Ids of folders that no longer exist are ignored and dropped on the next write. Nothing is written until the tree has loaded.
- When the active list changes, its ancestors open once. A manual collapse sticks until the active list changes.
- Mutations must invalidate `treeKeys.tree`, not a string literal.
- W-05 row actions must stop click propagation, because the row selects on click.
- The item crumb is a generic "Item" until W-07 supplies a title.
