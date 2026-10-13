# app-shell

## Purpose

Owns the top-level React Router setup and the persistent page chrome (header, Collections nav, main area). Currently serves only the Home route and a not-found route; the backend status indicator is temporary.

## Key files

- `src/app/App.tsx`: mounts `RouterProvider` with the router created once at module load.
- `src/app/router.tsx`: `routes` array, `createAppRouter` (browser history) and `createTestRouter` (memory history).
- `src/layouts/AppShell.tsx`: header, `Collections` nav, `main` with `Outlet`.
- `src/routes/HomeRoute.tsx`: "Home" heading at `/`.
- `src/routes/NotFoundRoute.tsx`: "Page not found" with a link back to `/`.
- `src/lib/backendStatus.ts`: `useBackendStatus` hook using plain `fetch('/readyz')`.
- `src/app/router.test.tsx`: shell landmarks, status text, home and not-found tests.
- `vite.config.ts`: dev server on :5173 and proxy for `/api`, `/healthz`, `/readyz`.

## Interfaces

- `routes: RouteObject[]`: `/` renders `AppShell` with index (`HomeRoute`) and `*` (`NotFoundRoute`) children.
- `createAppRouter(): Router`: browser-history router used by `App`.
- `createTestRouter(initialEntries?: string[]): Router`: memory router for tests, defaults to `['/']`.
- `AppShell()`: layout component; renders `header` (home link, status), `nav[aria-label="Collections"]`, `main`.
- `useBackendStatus(): 'checking' | 'ready' | 'down'`: fetches `/readyz` once on mount; 200 maps to `ready`, anything else or a network error to `down`.
- Vite proxy: `/api`, `/healthz`, `/readyz` forwarded to `API_PROXY_TARGET` (default `http://localhost:8080`).

## Gotchas

- The status hook is temporary: it is replaced by `lib/api` in W-02. Until then it is the only raw `fetch` in the app.
- Status starts as `checking`, so the header reads "Backend: checking" until `/readyz` settles.
- The nav is a placeholder ("Sidebar placeholder"), not a real collections list.
