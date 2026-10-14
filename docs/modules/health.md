# health

## Purpose

Reports backend readiness. Queries `GET /readyz` through `lib/api` and maps the result to `checking`, `ready` or `down`.

## Key files

- `src/features/health/api.ts`: `useBackendStatus` hook and `healthKeys`.
- `src/features/health/BackendStatus.tsx`: indicator (dot plus "Backend: …" text); shown in the sidebar footer and the mobile header.
- `src/layouts/AppShell.tsx`, `Sidebar.tsx`: where the indicator is placed.
- `src/app/router.test.tsx`: status text tests with MSW `/readyz` overrides.

## Interfaces

- `useBackendStatus(): BackendStatus`: `'checking'` while pending, `'ready'` on success, `'down'` on any error.
- `BackendStatus`: `'checking' | 'ready' | 'down'`.
- `<BackendStatus dotOnly? />`: `dotOnly` (icon rail) hides the text visually.
- `healthKeys.ready`: query key `['health', 'readyz']`.

## Gotchas

- The query sets `retry: false` and `staleTime: 0`, so it refetches on every mount and ignores the app-wide retry policy.
- `/readyz` sits outside `/api/v1` and returns plain text, so the request uses `parseAs: 'text'`.
- A 503 and an unreachable server both map to `down`, via `ApiError` and `NetworkError`.
- The text stays in the DOM even in `dotOnly`, so the state is never colour-only.
