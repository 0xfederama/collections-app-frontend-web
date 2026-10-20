# home

## Purpose

`/` Home: "Your lists" quick links (every list, most recently changed first) and "Recently updated" (the latest items across the workspace, D-070). An empty workspace shows a create-first-list state instead. Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §1.

## Key files

- `src/features/home/HomePage.tsx`: page body, empty state, own `useTreeDialogs()` copy for New list / New folder.
- `src/features/home/QuickLinks.tsx`: `listsByRecency`, link grid, skeleton and error states.
- `src/features/home/RecentItems.tsx`: "Recently updated" list, rows from search's `SearchResultBody`.
- `src/features/home/api.ts`: `useRecentItems`, `RECENT_LIMIT`; `homeKeys` is in `src/data/keys.ts`.
- `src/features/home/screens.ts`: the only export (no `index.ts`), imported by `src/routes/HomeRoute.tsx` (not lazy).
- `src/mocks/devRecent.ts`: dev-worker fake of `GET /api/v1/recent-items`.

## Interfaces

- `HomeRoute()` / `HomePage()`: element of `/` and its content.
- `QuickLinks({ index })`, `QuickLinksSkeleton()`, `QuickLinksError({ onRetry })`: list links from the tree index.
- `listsByRecency(index)`: lists sorted by `updated_at` descending (ties by name), with their folder path.
- `RecentItems()`: the "Recently updated" section.
- `useRecentItems(limit = 12)`: `GET /api/v1/recent-items`, `staleTime: 0`.
- `homeKeys.recent` (`src/data/keys.ts`): `['recent-items']`, prefix for the query key.

## Gotchas

- Quick links come from `GET /tree` (`useTreeIndex`), not from the recent endpoint; "Recently updated" uses the server's order.
- With no lists at all, the empty state replaces both sections (the wording differs when folders exist).
- Creates, trash, restore, purge and move invalidate `homeKeys.recent` (via `invalidateContent`); `staleTime: 0` also refetches on every mount.
- Recent rows link through `resultHref`, the same as search results.
