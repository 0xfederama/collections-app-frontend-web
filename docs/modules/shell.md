# shell

## Purpose

Top-level providers, router, and the responsive frame every route renders into (drawer, icon rail, resizable sidebar, detail panel). Spec: `/Users/federico/Developer/collections-app/design-docs/UI_SPEC.md` §2.

## Key files

- `src/app/App.tsx`: mounts `QueryClientProvider`, `ToastProvider` and `RouterProvider`.
- `src/app/router.tsx`: `routes` (every route is registered here), `createAppRouter`, `createTestRouter`.
- `src/app/lazyRoute.tsx`: `lazyRoute(load)`, code-split route screens with a skeleton.
- `src/layouts/AppShell.tsx`: layout per breakpoint, drawer state, detail panel, `/` shortcut.
- `src/layouts/Sidebar.tsx`, `SidebarResizer.tsx`, `useSidebarState.ts`: sidebar nav, splitter, persisted state.
- `src/lib/breakpoints.ts`, `src/lib/storage.ts`: breakpoint hook; `collection:` storage helpers.
- `src/features/search/`: sidebar search and `/` shortcut (see [search](search.md)).
- `src/features/tree/breadcrumbs.ts`: `useBreadcrumbs`.
- `src/routes/*Route.tsx`: route components; `ItemRoute` is a lazy wrapper of `features/items`; `ListRoute` and `SearchRoute` are implemented.
- `vite.config.ts`: dev server on :5173; proxies `/api` and `/readyz` to `API_PROXY_TARGET`.

## Interfaces

- `App()`: providers plus `RouterProvider`.
- `routes: RouteObject[]`; `createAppRouter()` (browser history); `createTestRouter(initialEntries?)` (memory history).
- `lazyRoute(load)`: returns a route element that loads its component on first render, with a `Suspense` skeleton.
- `AppShell()`: element of the `/` route; renders the frame for the current breakpoint.
  - `mobile` (< 768 px): `header` with "Open menu" (left drawer holding the Sidebar), workspace link, backend status; breadcrumbs; `main`.
  - `tablet` (768–1023): sidebar at saved width, or a 64 px icon rail when collapsed; not resizable.
  - `desktop` (1024–1279): sidebar at saved width with `SidebarResizer`.
  - `wide` (≥ 1280): as desktop, plus `aside[aria-label="Item details"]` beside `main` on item routes.
- `useBreakpoint()`: `'mobile' | 'tablet' | 'desktop' | 'wide'`, from `BREAKPOINTS` (768, 1024, 1280).
- `useSidebarState()`: `{ collapsed, width, setCollapsed, setWidth }`; width 220–400, default 280.
- `Sidebar({ rail, showHeader, onToggleRail, onRevealSearch, searchRef })`: `nav[aria-label="Collections"]`.
- `useBreadcrumbs()`: trail for the current list or item; `[]` on other routes.
- `useSearchShortcut(onTrigger)`: `/` outside text fields.

## Gotchas

- Route screens are code-split: `ListRoute`, `SearchRoute`, `SettingsRoute`, `TrashRoute` via `lazyRoute`; `ItemRoute` has its own `Suspense`. The entry bundle holds only the shell.
- Below 1280 px the item route replaces `main`'s `Outlet`, so `ListRoute` unmounts while an item is open. At ≥ 1280 the list stays mounted; the panel's close button navigates to `/lists/:listId` and keeps the current `?q=` and `?sort=`.
- The drawer is open for one `location.key`, so any navigation closes it.
- Sidebar state persists as `collection:sidebar` (`{ collapsed, width }`); `collapsed` only applies at tablet.
- Resizer: `role="separator"` labelled "Resize sidebar", `aria-controls="app-sidebar"`; ←/→ move 16 px, Home/End jump to min/max; pointer drag also works.
- `/` focuses the sidebar search. On the tablet rail it expands the sidebar first. On mobile it opens the drawer but does not focus the field.
- Route owners: `/` Home placeholder (W-13); `/lists/:listId` ListRoute (W-06); `/lists/:listId/items/:itemId` ItemRoute (W-07); `/search` SearchRoute (W-11); `/trash` (W-12); `/settings` (W-13). `*` is NotFoundRoute.
- Seams: tree writes live in `src/features/tree/*`; W-06 owns `src/routes/ListRoute.tsx` and `src/features/lists/*`; W-07 owns `src/features/items/*`. `router.tsx` already registers every route.
