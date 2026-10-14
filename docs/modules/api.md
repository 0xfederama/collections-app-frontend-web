# api

## Purpose

Vendors the backend OpenAPI contract at a pinned tag, generates its TypeScript types and examples, and provides the only client for server calls (`src/lib/api`), the TanStack Query defaults and the MSW mocks. Contract rules: [API.md](/Users/federico/Developer/collections-app/design-docs/API.md).

## Key files

- `scripts/api-sync.mjs`: vendors the spec at a tag, writes the lock, regenerates `src/generated/`.
- `scripts/api-check.mjs`: offline check of the lock sha256 and of generated files.
- `scripts/lib/generate.mjs`: openapi-typescript and example extraction, shared by both scripts.
- `api/openapi.yaml`, `api/openapi.lock.json`: vendored spec and `{ tag, commit, sha256 }`.
- `src/generated/schema.d.ts`, `examples.ts`: generated types and first 2xx example per operation.
- `src/lib/api/client.ts`, `errors.ts`, `etag.ts`: client, error classes, `If-Match` builder.
- `src/app/queryClient.ts`: app-wide QueryClient defaults and `shouldRetry`.
- `src/mocks/`: `handlers.ts`, `server.ts` (Node), `browser.ts` (worker), `problems.ts`.
- `src/test-utils.tsx`: render helpers with a fresh QueryClient.
- `src/main.tsx`, `vite.config.ts`, `public/mockServiceWorker.js`: dev-only mock worker.

## Interfaces

- `npm run api:sync -- api-v0.N.0 [--from <backend checkout>]`: tag only; without `--from` it shallow-clones the backend repo.
- `npm run api:check`: offline; runs first in `npm run check`.
- `api`, `createApiClient()`, `unwrap(call)`: openapi-fetch client, error middleware, empty-body guard.
- `ApiError` (`status`, `code`, `title`, `detail?`, `currentVersion?`, `errors?`, `requestId?`, `raw`), `NetworkError`.
- `etag(resource, version)`: e.g. `"i-3"`. `ifMatch(resource, version)`: `{ 'If-Match': … }`. Resources: folder, list, item, content, settings.
- `createQueryClient()`, `shouldRetry(failureCount, error)`: `staleTime` 30 s; mutations never retried.
- `handlers`, `server`, `worker`, `problemResponse(status, code, extra?, headers?)`.
- `renderWithProviders(ui, client?)`, `renderAt(path, client?)`, `createTestQueryClient()`.

## Gotchas

- Never edit `api/openapi.yaml` or `src/generated/`; `api:check` fails on any byte change. Restore with `api:sync -- <tag>`.
- Non-2xx responses throw `ApiError`; a failed fetch throws `NetworkError`; aborts pass through unwrapped.
- Retries: one retry only for `NetworkError` or 5xx. 4xx (including 412) is never retried.
- `ifMatch` has no way to send `*`. The 412 `currentVersion` is exposed on `ApiError` for the conflict UI.
- Client and MSW handlers use absolute `location.origin` URLs, because Node's fetch rejects relative URLs.
- Mocks are stateless: each operation answers with its first 2xx example. Image endpoints return a placeholder SVG.
- `/readyz` is `text/plain`: call it with `parseAs: 'text'`.
- MSW 3 imports from `msw/http`. Tests use `onUnhandledFrame: 'error'`; the dev worker uses `'bypass'`.
- `package.json` `overrides` lets openapi-typescript use the root TypeScript 6. Keep it.
- `api:sync` without `--from` needs network. `js-yaml` is a devDependency used only by `generate.mjs`.
- `VITE_API_MOCKS=1 npm run dev` starts the worker. A Vite plugin removes `dist/mockServiceWorker.js` from builds.
