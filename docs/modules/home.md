# home

## Purpose

`/` Home: "Your lists" quick links (every list, most recently changed first) and "Recently updated" (the latest items across the workspace, D-070). An empty workspace shows a create-first-list state instead. Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §1.

## Key files

- `src/features/home/HomePage.tsx`: page body, empty state, own `useTreeDialogs()` copy for New list / New folder.
- `src/features/home/QuickLinks.tsx`: `listsByRecency`, link grid, skeleton and error states.
- `src/features/home/RecentItems.tsx`: "Recently updated" list, rows from search's `SearchResultBody`.
- `src/features/home/api.ts`: `useRecentItems`, `homeKeys`, `RECENT_LIMIT`.
- `src/routes/HomeRoute.tsx`: route wrapper (not lazy).
- `src/mocks/devRecent.ts`: dev-worker fake of `GET /api/v1/recent-items`.

## Interfaces

- `HomeRoute()` / `HomePage()`: element of `/` and its content.
- `QuickLinks({ index })`, `QuickLinksSkeleton()`, `QuickLinksError({ onRetry })`: list links from the tree index.
- `listsByRecency(index)`: lists sorted by `updated_at` descending (ties by name), with their folder path.
- `RecentItems()`: the "Recently updated" section.
- `useRecentItems(limit = 12)`: `GET /api/v1/recent-items`, `staleTime: 0`.
- `homeKeys.recent`: `['recent-items']`, prefix for the query key.

## Gotchas

- Quick links come from `GET /tree` (`useTreeIndex`), not from the recent endpoint; "Recently updated" uses the server's order.
- With no lists at all, the empty state replaces both sections (the wording differs when folders exist).
- Nothing invalidates `homeKeys.recent`; `staleTime: 0` makes it refetch whenever Home mounts.
- Recent rows link through `resultHref`, the same as search results.
