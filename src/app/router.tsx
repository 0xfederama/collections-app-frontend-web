import { createBrowserRouter, createMemoryRouter, type RouteObject } from 'react-router'
import { AppShell } from '../layouts/AppShell'
import { HomeRoute } from '../routes/HomeRoute'
import { NotFoundRoute } from '../routes/NotFoundRoute'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: '*', element: <NotFoundRoute /> },
    ],
  },
]

export const createAppRouter = () => createBrowserRouter(routes)

// Used by tests so they do not need a browser history.
export const createTestRouter = (initialEntries: string[] = ['/']) =>
  createMemoryRouter(routes, { initialEntries })
