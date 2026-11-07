# shell

## Purpose

Top-level providers, router, and the responsive frame every route renders into: solid sidebar, phone root page (Home, see [home](home.md)), the item page's phone back control and the item detail sheet. Spec: `design-docs/UI_SPEC.md` §2; redesign: `design-docs/features/F-002-ui-refresh.md`.

## Key files

- `src/app/App.tsx`: mounts `QueryClientProvider`, `ToastProvider` and `RouterProvider`.
- `src/app/router.tsx`: `routes` (every route is registered here), `createAppRouter`, `createTestRouter`.
- `src/app/lazyRoute.tsx`: `lazyRoute(load)`, code-split route screens with a skeleton (Settings passes `fallback: null`, so no skeleton shows while it loads).
- `src/components/BackToHomeButton.tsx`: phone chevron that leads the list title row and the list gate states.
- `src/lib/previousPath.ts`: `useTrackPreviousPath` (mounted in `AppShell`) and `getPreviousPath()`, the pathname before the current one (`null` when opened directly).
- `src/components/PageHeaderSlot.tsx`: `PageHeaderSlot({ back })`, the phone back button that leads the item page's header row (and the sub-page's `ListGate` slot).
- `src/layouts/AppShell.tsx`: layout per breakpoint, detail sheet, `/` shortcut, `QuickAddProvider`.
- `src/layouts/Sidebar.tsx`, `SidebarResizer.tsx`, `useSidebarState.ts`: sidebar, splitter, persisted width.
- `src/features/tree/RailTree.tsx`: top-level entries of the collapsed sidebar.
- `src/features/search/`, `src/features/quickadd/`: sidebar search and Quick add (see [search](search.md), [quickadd](quickadd.md)).
- `src/routes/*Route.tsx`: route components; `ItemRoute` is a lazy wrapper of `features/items`.

## Interfaces

- `App()`: providers plus `RouterProvider`.
- `routes: RouteObject[]`; `createAppRouter()`; `createTestRouter(initialEntries?)`.
- `lazyRoute(load)`: route element that loads its component on first render.
- `AppShell()`: element of `/`; picks the frame for the current breakpoint.
  - No top bar. `mobile` (< 768 px): no sidebar and no drawer; `main` holds the page. Home (`/`) is the root page and lists the tree, Settings and Trash (see [home](home.md)).
  - From 768 px the sidebar collapses to a 64 px icon rail (top-level entries only) at any width.
  - `tablet` (768–1023): sidebar. `desktop` (1024–1279): sidebar with `SidebarResizer` (expanded only).
  - `wide` (≥ 1280): as desktop, plus a 420 px floating `aside[aria-label="Item details"]` on item routes.
- `BackToHomeButton()`: phones only (< 768 px), a 44 px chevron; goes back one step only when the previous page was `/` (`getPreviousPath()`), otherwise navigates to `/`.
- `PageHeaderSlot({ back: { to, label } })`: `to` is a router `To` (the item page passes its list path plus the current `?q=` / `?sort=` / filter search); back link on phones, rendered by the item page, its skeleton and its error state; renders nothing from 768 px. Top pages have no slot.
- `useBreakpoint()`: `'mobile' | 'tablet' | 'desktop' | 'wide'`, from `BREAKPOINTS` (768, 1024, 1280).
- `useSidebarState()`: `{ collapsed, width, setCollapsed, setWidth }`; width 220–400, default 268.
- `Sidebar({ rail, showHeader, onToggleRail, searchRef, onSearch, onQuickAdd })`: `nav[aria-label="Library"]`; workspace name and collapse toggle, search, Quick add, tree, then Trash and Settings.

## Gotchas

- Sidebar and detail sheet use the solid `material` classes (see [theme](theme.md)); there is no blur.
- Phones: a back chevron (`BackToHomeButton`) leads the list title row and every `ListGate` state of a top page. It goes back only when the previous page was `/`; from an item, a list reached by deep link, or a direct open it navigates to `/`. A sub-page that passes its own `ListGate` slot (the item page's `PageHeaderSlot`) replaces it: one back control per header row, first in the row, also in loading and error states, so titles never shift.
- Phones scroll the document (`AppShell` mobile `min-h-dvh`, no inner scroller). A push or replace to a different pathname scrolls to the top; POP is left to `useScrollRestore`.
- The desktop sidebar stays bounded to the viewport; `main` owns vertical scrolling. Flex ancestors need `min-h-0` and overflow containment for the sidebar and main scroll region to remain bounded.
- Route screens are code-split: `ListRoute`, `SearchRoute`, `SettingsRoute`, `TrashRoute` via `lazyRoute`; `ItemRoute` has its own `Suspense`.
- Below 1280 px the item route replaces `main`'s `Outlet`, so `ListRoute` unmounts while an item is open. At ≥ 1280 the list stays mounted; the sheet's close button goes to `/lists/:listId` and keeps `?q=` and `?sort=`.
- On phones `/` (the search shortcut) navigates to `/search` instead of focusing a sidebar field.
- Home-screen app (D-139): status bar style `default`; `black-translucent` gets a system blur on iOS 26.1+ that no page element can cover, so there is no top strip. `lib/theme.ts` `syncThemeChrome()` (called in `main.tsx`) makes the `theme-color` metas follow a forced theme.
- `index.html` viewport has `maximum-scale=1` (no iOS focus zoom; pinch stays) and `viewport-fit=cover`; `html` takes the theme background, and the shell and toast viewport pad with `env(safe-area-inset-*)` (`src/viewport.test.ts`).
- E2E phone specs `e2e/16-mobile.spec.ts` and `e2e/18-mobile-home.spec.ts` run only in the `mobile-webkit` Playwright project (iPhone 15, WebKit); chromium ignores them.
- Sidebar state persists as `collection:sidebar` (`{ collapsed, width }`); `collapsed` applies at every breakpoint from 768 px.
- Resizer: `role="separator"` "Resize sidebar", `aria-controls="app-sidebar"`; ←/→ move 16 px, Home/End jump to min/max.
- `/` focuses the sidebar search field (`searchRef` in `AppShell`).
- The sidebar holds search and Quick add above the tree; "+ New" under the tree appears only when the tree has nodes.
- Route owners: `/` Home; `/lists/:listId` ListRoute; `/lists/:listId/items/:itemId` ItemRoute; `/search`; `/trash`; `/settings`. `*` is NotFoundRoute.
