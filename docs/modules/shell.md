# shell

## Purpose

Top-level providers, router, and the responsive frame every route renders into: frosted sidebar, floating toolbars and the item detail sheet. Spec: `design-docs/UI_SPEC.md` §2; redesign: `design-docs/features/F-002-ui-refresh.md`.

## Key files

- `src/app/App.tsx`: mounts `QueryClientProvider`, `ToastProvider` and `RouterProvider`.
- `src/app/router.tsx`: `routes` (every route is registered here), `createAppRouter`, `createTestRouter`.
- `src/app/lazyRoute.tsx`: `lazyRoute(load)`, code-split route screens with a skeleton.
- `src/layouts/AppShell.tsx`: layout per breakpoint, drawer, detail sheet, `/` shortcut, `QuickAddProvider`.
- `src/layouts/Sidebar.tsx`, `SidebarResizer.tsx`, `useSidebarState.ts`: sidebar, splitter, persisted width.
- `src/features/tree/RailTree.tsx`: top-level entries of the collapsed sidebar.
- `src/features/search/`, `src/features/quickadd/`: sidebar search and Quick add (see [search](search.md), [quickadd](quickadd.md)).
- `src/routes/*Route.tsx`: route components; `ItemRoute` is a lazy wrapper of `features/items`.

## Interfaces

- `App()`: providers plus `RouterProvider`.
- `routes: RouteObject[]`; `createAppRouter()`; `createTestRouter(initialEntries?)`.
- `lazyRoute(load)`: route element that loads its component on first render.
- `AppShell()`: element of `/`; picks the frame for the current breakpoint.
  - No top bar. `mobile` (< 768 px): floating "Open menu" button (drawer holding the Sidebar); `main`.
  - From 768 px the sidebar collapses to a 64 px icon rail (top-level entries only) at any width.
  - `tablet` (768–1023): sidebar. `desktop` (1024–1279): sidebar with `SidebarResizer` (expanded only).
  - `wide` (≥ 1280): as desktop, plus a 420 px floating `aside[aria-label="Item details"]` on item routes.
- `useBreakpoint()`: `'mobile' | 'tablet' | 'desktop' | 'wide'`, from `BREAKPOINTS` (768, 1024, 1280).
- `useSidebarState()`: `{ collapsed, width, setCollapsed, setWidth }`; width 220–400, default 268.
- `Sidebar({ rail, showHeader, onToggleRail, searchRef, onSearch, onQuickAdd })`: `nav[aria-label="Library"]`; workspace name and collapse toggle, search, Quick add, tree, then Trash and Settings.

## Gotchas

- Sidebar, mobile menu button and detail sheet use the frosted `material` classes (see [theme](theme.md)).
- Route screens are code-split: `ListRoute`, `SearchRoute`, `SettingsRoute`, `TrashRoute` via `lazyRoute`; `ItemRoute` has its own `Suspense`.
- Below 1280 px the item route replaces `main`'s `Outlet`, so `ListRoute` unmounts while an item is open. At ≥ 1280 the list stays mounted; the sheet's close button goes to `/lists/:listId` and keeps `?q=` and `?sort=`.
- The drawer is open for one `location.key`, so any navigation closes it.
- Sidebar state persists as `collection:sidebar` (`{ collapsed, width }`); `collapsed` applies at every breakpoint from 768 px.
- Resizer: `role="separator"` "Resize sidebar", `aria-controls="app-sidebar"`; ←/→ move 16 px, Home/End jump to min/max.
- `/` focuses the top-bar search field (`searchRef` in `AppShell`).
- The sidebar has no search or Quick add of its own; "+ New" under the tree appears only when the tree has nodes.
- Route owners: `/` Home; `/lists/:listId` ListRoute; `/lists/:listId/items/:itemId` ItemRoute; `/search`; `/trash`; `/settings`. `*` is NotFoundRoute.
