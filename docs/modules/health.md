# health

## Purpose

Reports backend readiness for the app header. Queries `GET /readyz` through `lib/api` and maps the result to `checking`, `ready` or `down`.

## Key files

- `src/features/health/api.ts`: `useBackendStatus` hook and `healthKeys`.
- `src/layouts/AppShell.tsx`: renders the status in the header.
- `src/app/router.test.tsx`: status text tests with MSW `/readyz` overrides.

## Interfaces

- `useBackendStatus(): BackendStatus`: `'checking'` while pending, `'ready'` on success, `'down'` on any error.
- `BackendStatus`: `'checking' | 'ready' | 'down'`.
- `healthKeys.ready`: query key `['health', 'readyz']`.

## Gotchas

- The query sets `retry: false` and `staleTime: 0`, so it refetches on every mount and ignores the app-wide retry policy.
- `/readyz` sits outside `/api/v1` and returns plain text, so the request uses `parseAs: 'text'`.
- A 503 and an unreachable server both map to `down`, via `ApiError` and `NetworkError`.
