# trash

## Purpose

The `/trash` page: lists deleted batches (folders, lists, items), restores them in place or to a chosen destination, and deletes them permanently. Spec: `/Users/federico/Developer/collections-app/design-docs/PRODUCT.md` §10, `UI_SPEC.md` §7 and §9; API shape and counts: D-065 in `DECISIONS.md`.

## Key files

- `src/features/trash/api.ts`: `useTrash`, `useRestoreTrash`, `usePurgeTrash`.
- `src/features/trash/keys.ts`: `trashKeys`, `LISTS_KEY_ROOT`, `ITEMS_KEY_ROOT` (re-exported by `api.ts`).
- `src/features/trash/model.ts`: counts and path text, `blockedBy`, relative time.
- `src/features/trash/errors.ts`: `classifyTrashError`, error kinds and messages.
- `src/features/trash/TrashPage.tsx`: page states, Load more, dialog wiring.
- `src/features/trash/TrashRow.tsx`: one batch row, its blocked state and actions.
- `src/features/trash/RestoreToDialog.tsx`: "Restore to…" picker and destination rules.
- `src/features/trash/PurgeDialog.tsx`: permanent delete confirmation.
- `src/features/trash/useRestoreFeedback.ts`, `TrashError.tsx`: success toast with "Open"; inline error with retry.
- `src/routes/TrashRoute.tsx`: `/trash` route element.
- `src/mocks/devTrash.ts`: stateful fake (`createTrashBackend`) for the dev worker and tests.

## Interfaces

- `useTrash()`: infinite query by offset, 50 rows per page, key `trashKeys.list`.
- `useRestoreTrash()`: `mutate({ batchId, destination? })`; no destination means the original place.
- `usePurgeTrash()`: `mutate(batchId)`, calls `DELETE /api/v1/trash/{batch_id}`.
- `trashKeys`: `all`, `list`; invalidate with these, not literals.
- Restore and purge call `invalidateContent` (see [api](api.md)).
- `TrashPage()`: element of `/trash`.
- `RestoreToDialog({ entry, onClose, onRestored, onGone })`, `destinationOptions(entry, index)`.
- `PurgeDialog({ entry, onClose, onDone })`, `purgeDescription(entry)`.
- `classifyTrashError(error)`: `gone`, `parent_in_trash`, `cycle`, `unavailable`, `validation`, `network`, `other`.
- `blockedBy(entry, entries)`, `countsText(counts)`, `restoredHref(entry, result, destination?)`.
- `createTrashBackend(entries)`: `{ handlers, state }` for tests.

## Gotchas

- Layout: two-column rows from 768 px (`md`), a three-column table from 1280 px (`xl`), stacked cards below.
- The empty Trash centres the shared `EmptyState` in the **whole** content area, like Home: the page drops `max-w-5xl` when there is nothing in the Trash, so `EmptyState`'s own `items-center` does the centring, and the block stays in normal flow under the heading. `EmptyState` itself is unchanged (2026-10-16).
- Opening the page always refetches (`staleTime: 0`, `refetchOnMount: 'always'`), since delete actions elsewhere do not update it.
- `trash/api.test.ts` checks `LISTS_KEY_ROOT` and `ITEMS_KEY_ROOT` against the real keys.
- A 404 or 409 refetches trash and tree. A 404 shows an "Already gone" toast and closes the dialog.
- A blocked entry names its original parent from the last `former_path` segment. "Restore ‘X’ instead" shows only when that parent is the root of a loaded entry that is itself restorable in place. Otherwise only "Restore to…" is offered; nothing is guessed.
- Picker: folder and list roots choose a folder or Top level; item roots choose a list, with folders as plain labels. A `cycle_detected` 409 disables the chosen folder with its reason.
- Counts include the root itself (D-065). Tree and item delete confirms use the same `countsText` wording.
- The purge dialog states the counts, that image files go too, and that older entries nested inside go too. No type-to-confirm.
- Folders have no page, so restoring a folder toast has no "Open" action.
- `devTrash.ts` is not synced with the dev tree or items: a restore there does not bring anything back into the sidebar.
