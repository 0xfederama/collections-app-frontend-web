# tree

## Purpose

The folder/list tree, its query and index, and folder and list writes including list icon creation and editing.

## Key files

- `index.ts`: public face; `treeKeys` is in `src/data/keys.ts`.
- `api.ts`: tree query, types and index; `treeLookup.ts`: `findNode`, `nameOf`, `isOpenWithin`, `isInSharedFolder`.
- `SidebarTree.tsx`, `RailTree.tsx`: sidebar and collapsed rail.
- `mutations.ts`: folder/list writes, reorder and icon updates; success calls `invalidateContent`.
- `treeMoves.ts`: move actions behind the menus and dialogs.
- `useTreeDialogs.tsx`, `NameDialog.tsx`: create flows and dialogs; `Vanished.tsx` tells a dialog its target is gone.
- `listFolderMemory.ts`: folder a new list goes into (session only).
- `ListIconEdit.tsx`: list icon popover bound to a list snapshot; each choice is its own write with `If-Match`.
- `ListActionsMenu.tsx`, `NodeMenu.tsx`: list and node actions.
- `useRefreshDetails.ts`, `refreshMessage.ts`: "Refresh details" for movie and TV lists (pure helpers and toast text).
- `order.ts`, `ListGate.tsx`: ordering rules and list route gate.
- `slots.tsx`: sidebar slot content, including the "New" row (`TreeNewButton`).

## Interfaces

- `useTree()`, `useTreeIndex()`, `createTreeIndex(data)`: tree data and index.
- `isInSharedFolder(index, id)`: `true` when `id` is a shared top-level folder or sits inside one.
- `useCreateList()`, `useUpdateListIcon()`, `useMoveList()`, `useDeleteList()`, `useReorderSiblings()`: mutations.
- `useTreeDialogs()`: tree actions and dialogs.
- `ListIconEdit({ list, open, onOpenChange, children?, anchorEl?, onCloseAutoFocus? })`: list icon popover (wraps a trigger child, or opens beside `anchorEl`).
- `ListActionsMenu({ list })`, `SidebarTree()`, `ListGate({ listId, children, slot? })`.
- `useRefreshDetails(listId)` → `{ run, pending }`; `canRefreshDetails(list)`, `refreshSummary(counts)`.

- `sharing/`: `folderRights`, `ShareDialog`, `LeaveDialog`, `SharingDialogs`, `useShareFolder`, `useRemoveFolderMember` (F-027 W3: share, remove, stop sharing, leave; top-level folders only, sidebar menu only).

## Gotchas

- Create and icon update send `icon` and `icon_color`; icon update uses the list snapshot's version in `If-Match`.
- "Change icon" is in the sidebar row "…" only (`NodeMenu` `changeIcon`). The popover opens beside that row (found by `data-tree-id`) and focus returns to the row on close. The list header opens the same popover from its icon button.
- Each icon or colour choice applies at once. A successful write moves the snapshot to the response, so the next choice is not a false conflict. A 412 keeps the popover open with the error and a "Reload latest" action (no confirmation, no draft copy); reload refetches the list and invalidates the tree.
- New list icon choice is a compact labelled field beside Name on the same row, including mobile. The "Choose icon" button opens `ListIconPopover` and the choice is sent on Create. The list mark is rendered by [lists](lists.md) in the sidebar, rail, list header and search results.
- `ListGate` renders its `slot` first in the loading, error and not-found states. With no slot (list pages) it renders `BackToHomeButton`, which only shows on phones; item routes pass a `PageHeaderSlot` back control instead, so a sub-page has one back control (F-026 W5).
- "Refresh details" is in the list header "…" menu only, shown for movie and TV lists with items. It posts `lookup-refresh` (no `If-Match`), shows a "Refreshing details…" toast, then invalidates content. "Run again" (action on the result toast) appears while `remaining` > 0. Covered by `e2e/17-refresh-details.spec.ts`.
- Folder and list names share one text column. The "New" row uses the same 8 px inset, 22 px icon box and gap as a top-level list row; `px-2!` overrides the Button size padding. `e2e/19-tree-new-row.spec.ts` (chromium) checks the alignment.
- Create/move bodies include `folder_id` (`null` = top level); reorder is within same-kind siblings under one parent.
- Shared folders (F-027) get the two-person `SharedBadge` on their icon in the sidebar and the rail, and ", shared" in the accessible name. Only folders are badged here; a list inside a shared folder is shared through it (the badge shows on [home](home.md) quick links), a top-level list never is.
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for full interaction details.
