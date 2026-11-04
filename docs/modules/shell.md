# shell

## Purpose

Top-level providers, router, and the responsive frame every route renders into: solid sidebar, page header rows (phone menu or back control) and the item detail sheet. Spec: `design-docs/UI_SPEC.md` §2; redesign: `design-docs/features/F-002-ui-refresh.md`.

## Key files

- `src/app/App.tsx`: mounts `QueryClientProvider`, `ToastProvider` and `RouterProvider`.
- `src/app/router.tsx`: `routes` (every route is registered here), `createAppRouter`, `createTestRouter`.
- `src/app/lazyRoute.tsx`: `lazyRoute(load)`, code-split route screens with a skeleton (Settings passes `fallback: null`, so no skeleton shows while it loads).
- `src/components/PageHeaderSlot.tsx`: `PageHeaderSlot({ back? })` and `MobileMenuProvider`; the phone menu or back button in a page's header row.
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
  - No top bar. `mobile` (< 768 px): the drawer (holding the Sidebar) opens from the "Open menu" button in each page's header row; `main`.
  - From 768 px the sidebar collapses to a 64 px icon rail (top-level entries only) at any width.
  - `tablet` (768–1023): sidebar. `desktop` (1024–1279): sidebar with `SidebarResizer` (expanded only).
  - `wide` (≥ 1280): as desktop, plus a 420 px floating `aside[aria-label="Item details"]` on item routes.
- `PageHeaderSlot({ back? })`: menu button on phones (top-level pages), back link when `back` is set (item pages); renders nothing from 768 px.
- `useBreakpoint()`: `'mobile' | 'tablet' | 'desktop' | 'wide'`, from `BREAKPOINTS` (768, 1024, 1280).
- `useSidebarState()`: `{ collapsed, width, setCollapsed, setWidth }`; width 220–400, default 268.
- `Sidebar({ rail, showHeader, onToggleRail, searchRef, onSearch, onQuickAdd })`: `nav[aria-label="Library"]`; workspace name and collapse toggle, search, Quick add, tree, then Trash and Settings.

## Gotchas

- Sidebar and detail sheet use the solid `material` classes (see [theme](theme.md)); there is no blur.
- Phones: the menu button is the first control of each page's header row (`PageHeaderSlot`), also in loading and error states, so titles never shift. The drawer returns focus to it on close.
- The desktop sidebar stays bounded to the viewport; `main` owns vertical scrolling. Flex ancestors need `min-h-0` and overflow containment for the sidebar and main scroll region to remain bounded.
- Route screens are code-split: `ListRoute`, `SearchRoute`, `SettingsRoute`, `TrashRoute` via `lazyRoute`; `ItemRoute` has its own `Suspense`.
- Below 1280 px the item route replaces `main`'s `Outlet`, so `ListRoute` unmounts while an item is open. At ≥ 1280 the list stays mounted; the sheet's close button goes to `/lists/:listId` and keeps `?q=` and `?sort=`.
- The drawer is open for one `location.key`, so any navigation closes it. Its panel takes `className` (`px-3`); the drawer's Sidebar drops its side padding (`showHeader={false}`) so rows meet the edges.
- `index.html` viewport has `maximum-scale=1` (no iOS focus zoom; pinch stays) and `viewport-fit=cover`; `html` takes the theme background, and the shell, drawer and toast viewport pad with `env(safe-area-inset-*)` (`src/viewport.test.ts`).
- E2E phone spec `e2e/16-mobile.spec.ts` runs only in the `mobile-webkit` Playwright project (iPhone 15, WebKit); chromium ignores it.
- Sidebar state persists as `collection:sidebar` (`{ collapsed, width }`); `collapsed` applies at every breakpoint from 768 px.
- Resizer: `role="separator"` "Resize sidebar", `aria-controls="app-sidebar"`; ←/→ move 16 px, Home/End jump to min/max.
- `/` focuses the sidebar search field (`searchRef` in `AppShell`).
- The sidebar holds search and Quick add above the tree; "+ New" under the tree appears only when the tree has nodes.
- Route owners: `/` Home; `/lists/:listId` ListRoute; `/lists/:listId/items/:itemId` ItemRoute; `/search`; `/trash`; `/settings`. `*` is NotFoundRoute.
