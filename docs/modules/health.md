# health

## Purpose

Backend readiness probe. Queries `GET /readyz` through `lib/api` and maps the result to `checking`, `ready` or `down`. Shown only in Settings > Connection (the sidebar and header indicator were removed in F006-W9).

## Key files

- `src/features/health/api.ts`: `useBackendCheck` hook and `BackendStatus` type; `index.ts` is the public face.
- `src/features/settings/ConnectionSection.tsx`: renders the status and "Check again" (see [settings](settings.md)).
- `src/features/settings/ConnectionSection.test.tsx`: status and re-check tests with MSW `/readyz` overrides.

## Interfaces

- `useBackendCheck(): { status: BackendStatus; check: () => void }`: `status` is `'checking'` while pending or refetching, `'ready'` on success, `'down'` on any error; `check()` re-runs the probe.
- `BackendStatus`: `'checking' | 'ready' | 'down'`.
- `healthKeys.ready` (`src/data/keys.ts`): query key `['health', 'readyz']`.

## Gotchas

- The query sets `retry: false` and `staleTime: 0`, so it refetches on every mount and ignores the app-wide retry policy.
- Nothing polls it: the probe runs when `/settings` mounts and on "Check again".
- `/readyz` sits outside `/api/v1` and returns plain text, so the request uses `parseAs: 'text'`.
- A 503 and an unreachable server both map to `down`, via `ApiError` and `NetworkError`.
