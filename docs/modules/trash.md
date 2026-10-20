# trash

## Purpose

The `/trash` page lists deleted batches and supports restore, permanent deletion, and emptying all trash.

## Key files

- `src/features/trash/api.ts`: paginated read, restore, purge and empty mutations.
- `TrashPage.tsx`: rows, pagination and empty-trash flow.
- `EmptyTrashDialog.tsx`, `PurgeDialog.tsx`: destructive confirmations.
- `RestoreToDialog.tsx`, `model.ts`: destination rules and row counts.
- `errors.ts`, `devTrash.ts`: errors and dev fake; `trashKeys` is in `src/data/keys.ts`.
- `index.ts` (public face, `countsText`), `screens.ts` (page for `TrashRoute`), `useRestoreFeedback.ts`.

## Interfaces

- `useTrash()`: infinite query in 50-entry pages.
- `useRestoreTrash()`, `usePurgeTrash()`, `useEmptyTrash()`.
- `EmptyTrashDialog({ entries, itemCount, onClose, onDone })`.
- `TrashPage()`, `countsText(counts)`, `trashKeys` (`src/data/keys.ts`).

## Gotchas

- Empty trash first loads every page to determine batch and item counts; load failure leaves the confirmation unavailable and offers retry.
- Confirmation calls `DELETE /api/v1/trash` to remove all batches and image files; success invalidates content and reports completion.
- Individual purge remains `DELETE /api/v1/trash/{batch_id}`. Both forms of deletion are permanent.
- Trash refetches on page mount because deletes elsewhere do not update its cached query.
- See [design docs](/Users/federico/Developer/collections-app/design-docs/) for restore and retention rules.
