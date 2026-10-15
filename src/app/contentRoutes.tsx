import type { RouteObject } from 'react-router'
import { HomeRoute } from '../routes/HomeRoute'
import { NotFoundRoute } from '../routes/NotFoundRoute'
import { lazyRoute } from './lazyRoute'

// Route screens load on first visit, so the entry bundle only holds the shell (item routes are
// split inside `ItemRoute`, which the shell renders itself).
const ListRoute = lazyRoute(() => import('../routes/ListRoute').then((m) => m.ListRoute))
const SearchRoute = lazyRoute(() => import('../routes/SearchRoute').then((m) => m.SearchRoute))
const TrashRoute = lazyRoute(() => import('../routes/TrashRoute').then((m) => m.TrashRoute))

/**
 * The pages that fill `main`. Shared by the router and by the shell, which renders them again for
 * the page behind the Settings pane.
 */
export const contentRoutes: RouteObject[] = [
  { index: true, element: <HomeRoute /> },
  // The item child has no element: AppShell renders ItemRoute itself, because where it goes
  // (full page in `main` or the detail panel) depends on the breakpoint.
  { path: 'lists/:listId', element: <ListRoute />, children: [{ path: 'items/:itemId' }] },
  { path: 'search', element: <SearchRoute /> },
  { path: 'trash', element: <TrashRoute /> },
  { path: '*', element: <NotFoundRoute /> },
]
