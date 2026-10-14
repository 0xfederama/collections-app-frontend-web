import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router'
import { AppShell } from '../layouts/AppShell'
import { HomeRoute } from '../routes/HomeRoute'
import { ListRoute } from '../routes/ListRoute'
import { NotFoundRoute } from '../routes/NotFoundRoute'
import { SearchRoute } from '../routes/SearchRoute'
import { SettingsRoute } from '../routes/SettingsRoute'
import { TrashRoute } from '../routes/TrashRoute'

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
