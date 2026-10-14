import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router'
import { AppShell } from '../layouts/AppShell'
import { HomeRoute } from '../routes/HomeRoute'
import { NotFoundRoute } from '../routes/NotFoundRoute'
import { lazyRoute } from './lazyRoute'

// Route screens load on first visit, so the entry bundle only holds the shell (item routes are
// split inside `ItemRoute`, which the shell renders itself).
const ListRoute = lazyRoute(() => import('../routes/ListRoute').then((m) => m.ListRoute))
const SearchRoute = lazyRoute(() => import('../routes/SearchRoute').then((m) => m.SearchRoute))
const SettingsRoute = lazyRoute(() =>
  import('../routes/SettingsRoute').then((m) => m.SettingsRoute),
)
const TrashRoute = lazyRoute(() => import('../routes/TrashRoute').then((m) => m.TrashRoute))

// Component gallery: dev only, lazy, so it never reaches the production bundle.
const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/dev/ui',
        lazy: async () => ({ Component: (await import('../dev/DevUiRoute')).DevUiRoute }),
      },
    ]
  : []

export const routes: RouteObject[] = [
  ...devRoutes,
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRoute /> },
      // The item child has no element: AppShell renders ItemRoute itself, because where it goes
      // (full page in `main` or the detail panel) depends on the breakpoint.
      { path: 'lists/:listId', element: <ListRoute />, children: [{ path: 'items/:itemId' }] },
      { path: 'search', element: <SearchRoute /> },
      { path: 'trash', element: <TrashRoute /> },
      { path: 'settings', element: <SettingsRoute /> },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]

export const createAppRouter = () => createBrowserRouter(routes)

// Used by tests so they do not need a browser history.
export const createTestRouter = (initialEntries: string[] = ['/']) =>
  createMemoryRouter(routes, { initialEntries })
