# home

## Purpose

`/` Home: "Your lists" quick links (every list, most recently changed first) and "Recently updated" (the latest items across the workspace, D-070). An empty workspace shows a create-first-list state instead. On phones (< 768 px) Home is the root page: `MobileHome` replaces the two sections with a large title, search, the Quick add button, the lists, five recent items and Settings / Trash rows. Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §1.

## Key files

- `src/features/home/HomePage.tsx`: page body, empty state, own `useTreeDialogs()` copy for New list / New folder.
- `src/features/home/MobileHome.tsx`: phone layout, in order: wrapping workspace name, search field (Enter opens `/search?q=`), Quick add button (full width), "Lists" (the sidebar tree), "Recently updated" (5), Settings and Trash rows.
- `src/features/home/QuickLinks.tsx`: `listsByRecency`, link grid, skeleton and error states.
- `src/features/home/RecentItems.tsx`: "Recently updated" list, rows from search's `SearchResultBody`.
- `src/features/home/api.ts`: `useRecentItems`, `RECENT_LIMIT`; `homeKeys` is in `src/data/keys.ts`.
- `src/features/home/screens.ts`: the only export (no `index.ts`), imported by `src/routes/HomeRoute.tsx` (not lazy).
- `src/mocks/devRecent.ts`: dev-worker fake of `GET /api/v1/recent-items`.

## Interfaces

- `HomeRoute()` / `HomePage()`: element of `/` and its content.
- `QuickLinks({ index })`, `QuickLinksSkeleton()`, `QuickLinksError({ onRetry })`: list links from the tree index.
- `MobileHome({ empty })`: phone root page; `empty` is the create-first-list state or `null`.
- `listsByRecency(index)`: lists sorted by `updated_at` descending (ties by name), with their folder path.
- `RecentItems({ limit? })`: the "Recently updated" section; `limit` defaults to `RECENT_LIMIT` (12), phones pass 5.
- `useRecentItems(limit = 12)`: `GET /api/v1/recent-items`, `staleTime: 0`.
- `homeKeys.recent` (`src/data/keys.ts`): `['recent-items']`, prefix for the query key.

## Gotchas

- Quick links come from `GET /tree` (`useTreeIndex`), not from the recent endpoint; "Recently updated" uses the server's order.
- With no lists at all, the empty state replaces both sections (the wording differs when folders exist).
- Creates, trash, restore, purge and move invalidate `homeKeys.recent` (via `invalidateContent`); `staleTime: 0` also refetches on every mount.
- Recent rows link through `resultHref`, the same as search results.
- Phones: no drawer. The tree is the sidebar's `SidebarTree`, so expand, row actions and "+ New" match the sidebar. The document scrolls; `HomePage` restores it on back navigation (`useScrollRestore`, window on phones).
- Phones with no lists: the empty state replaces only the "Lists" section; "Recently updated" is hidden, Settings and Trash stay.
