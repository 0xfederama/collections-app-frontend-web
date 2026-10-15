import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router'
import { AppShell } from '../layouts/AppShell'
import { contentRoutes } from './contentRoutes'
import { lazyRoute } from './lazyRoute'

// The Settings pane loads on first visit.
const SettingsRoute = lazyRoute(() =>
  import('../routes/SettingsRoute').then((m) => m.SettingsRoute),
)

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
    children: [{ path: 'settings', element: <SettingsRoute /> }, ...contentRoutes],
  },
]

export const createAppRouter = () => createBrowserRouter(routes)

// Used by tests so they do not need a browser history.
export const createTestRouter = (initialEntries: string[] = ['/']) =>
  createMemoryRouter(routes, { initialEntries })
