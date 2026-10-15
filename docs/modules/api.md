# api

## Purpose

Vendors the backend OpenAPI contract at a pinned tag (currently `api-v0.5.0`, see `api/openapi.lock.json`), generates its TypeScript types and examples, and provides the only client for server calls (`src/lib/api`), the TanStack Query defaults and the MSW mocks. Contract rules: [API.md](/Users/federico/Developer/collections-app/design-docs/API.md).

## Key files

- `scripts/api-sync.mjs`, `api-check.mjs`, `lib/generate.mjs`: vendor and regenerate; offline check of lock and generated files.
- `api/openapi.yaml`, `api/openapi.lock.json`: vendored spec and `{ tag, commit, sha256 }`.
- `src/generated/schema.d.ts`, `examples.ts`: generated types (typed `ItemSummary.metadata`, `PinnedFields`) and examples.
- `src/lib/api/client.ts`, `errors.ts`, `etag.ts`: client, error classes, `If-Match` builder.
- `src/app/queryClient.ts`: app-wide QueryClient defaults and `shouldRetry`.
- `src/features/invalidateContent.ts`: the one invalidation for create, trash, restore, purge and move.
- `src/mocks/`: `handlers.ts`, `server.ts` (Node), `browser.ts` (worker), `devData.ts`, `devTree.ts` (`createTreeBackend`), `problems.ts`.
- `src/test-utils.tsx`: render helpers with a fresh QueryClient.
- `src/main.tsx`, `vite.config.ts`, `public/mockServiceWorker.js`: dev-only mock worker.

## Interfaces

- `npm run api:sync -- api-v0.N.0 [--from <backend checkout>]`: tag only; without `--from` it shallow-clones the backend repo.
- `npm run api:check`: offline; runs first in `npm run check`.
- `api`, `createApiClient()`, `unwrap(call)`: openapi-fetch client, error middleware, empty-body guard.
- `ApiError` (`status`, `code`, `title`, `detail?`, `currentVersion?`, `errors?`, `requestId?`, `raw`), `NetworkError`.
- `etag(resource, version)`: e.g. `"i-3"`. `ifMatch(resource, version)`: `{ 'If-Match': … }`. Resources: folder, list, item, content, settings.
- `createQueryClient()`, `shouldRetry(failureCount, error)`: `staleTime` 30 s; mutations never retried.
- `invalidateContent(queryClient)`: invalidates tree, `['lists']`, `['items']`, search, `homeKeys.recent` and trash.
- `handlers`, `server`, `worker` (`devHandlers` + `handlers`), `problemResponse(status, code, extra?, headers?)`.
- `renderWithProviders(ui, client?)`, `renderAt(path, client?)`, `createTestQueryClient()`.

## Gotchas

- Never edit `api/openapi.yaml` or `src/generated/`; `api:check` fails on any byte change. Restore with `api:sync -- <tag>`.
- Contract 0.5.0 adds list `pinned_fields` (PATCH; `null` resets), item `paid_platforms`, and kind fields such as `camera_type` and episodes.
- Non-2xx responses throw `ApiError`; a failed fetch throws `NetworkError`; aborts pass through unwrapped.
- Retries: one retry only for `NetworkError` or 5xx. 4xx (including 412) is never retried.
- `ifMatch` has no way to send `*`. The 412 `currentVersion` is exposed on `ApiError` for the conflict UI.
- Client and MSW handlers use absolute `location.origin` URLs, because Node's fetch rejects relative URLs.
- Mocks are stateless: each operation answers with its first 2xx example, except folders and lists, which `createTreeBackend` keeps in memory (checks `If-Match`, cycles and order_stale). Image endpoints return a placeholder SVG.
- `/readyz` is `text/plain`: call it with `parseAs: 'text'`.
- MSW 3 imports from `msw/http`. Tests use `onUnhandledFrame: 'error'`; the dev worker uses `'bypass'`.
- `package.json` `overrides` lets openapi-typescript use the root TypeScript 6. Keep it.
- `api:sync` without `--from` needs network. `js-yaml` is a devDependency used only by `generate.mjs`.
- `VITE_API_MOCKS=1 npm run dev` starts the worker, which prepends the richer, stateful tree from `devData.ts`. Vitest uses only the spec examples. A Vite plugin removes `dist/mockServiceWorker.js` from builds.
