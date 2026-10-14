# app-shell

## Purpose

Owns the top-level providers (TanStack Query, React Router) and the persistent page chrome (header, Collections nav, main area). Currently serves only the Home route and a not-found route.

## Key files

- `src/app/App.tsx`: mounts `QueryClientProvider` and `RouterProvider`; the query client and router are created once at module load.
- `src/app/router.tsx`: `routes` array, `createAppRouter` (browser history) and `createTestRouter` (memory history).
- `src/layouts/AppShell.tsx`: header, `Collections` nav, `main` with `Outlet`; reads status from `features/health`.
- `src/routes/HomeRoute.tsx`: "Home" heading at `/`.
- `src/routes/NotFoundRoute.tsx`: "Page not found" with a link back to `/`.
- `src/app/router.test.tsx`: shell landmarks, status text (via MSW), home and not-found tests.
- `vite.config.ts`: dev server on :5173 and proxy for `/api` and `/readyz`.

## Interfaces

- `routes: RouteObject[]`: `/` renders `AppShell` with index (`HomeRoute`) and `*` (`NotFoundRoute`) children.
- `createAppRouter(): Router`: browser-history router used by `App`.
- `createTestRouter(initialEntries?: string[]): Router`: memory router for tests, defaults to `['/']`.
- `AppShell()`: layout component; renders `header` (home link, status), `nav[aria-label="Collections"]`, `main`.
- Vite proxy: `/api` and `/readyz` forwarded to `API_PROXY_TARGET` (default `http://localhost:8080`).

## Gotchas

- Status starts as `checking`, so the header reads "Backend: checking" until `/readyz` settles (see [health](health.md)).
- The nav is a placeholder ("Sidebar placeholder"), not a real collections list.
