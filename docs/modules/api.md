# api

## Purpose

Pins the backend OpenAPI contract, generates TypeScript types/examples, and provides the API client, query defaults and MSW mocks.

## Key files

- `api/openapi.yaml`, `api/openapi.lock.json`: vendored contract and pin.
- `scripts/api-sync.mjs`, `api-check.mjs`: sync and offline drift check.
- `src/generated/schema.d.ts`, `examples.ts`: generated API types and examples.
- `src/lib/api/`: openapi-fetch client, errors and ETag helpers.
- `src/features/invalidateContent.ts`: shared content invalidation.
- `src/mocks/`: test handlers and dev fakes.

## Interfaces

- `npm run api:sync -- api-v0.N.0 [--from <backend checkout>]`, `npm run api:check`.
- `api`, `createApiClient()`, `unwrap(call)`, `ApiError`, `NetworkError`.
- `GET /api/v1/tmdb/suggestions`, `POST /api/v1/items/{id}/lookup`.
- `GET|POST /api/v1/kinds`, `PATCH|DELETE /api/v1/kinds/{key}`, field routes under `/fields` (see `features/settings/api.ts`).
- `etag(resource, version)`, `ifMatch(resource, version)`, `invalidateContent(queryClient)`.
- `createQueryClient()`, `shouldRetry(failureCount, error)`.

## Gotchas

- Current pinned contract: `api-v0.10.1` (web 2.5.0). Do not edit `api/openapi.yaml` or `src/generated/`; run `api:sync` and verify with `api:check`.
- F014 (`api-v0.10.1`): kind definitions and fields are API data with their own ETags (`"k-N"`, `"kf-N"`); `src/mocks/kinds.ts` serves them read-only to tests and the dev worker.
- F013 adds TMDB suggestions and item lookup, movie `director`, the movie-only `director` sort, settings `metadata_language`, and read-only `lookup_available`.
- Setting retention to `null` disables it; changing the value does not purge immediately. The API accepts 1–365 days; the UI offers Off, 7, 30 and 90.
- Mutations use ETags; 412 is not retried. Network and 5xx failures can retry once.
- See [API design docs](/Users/federico/Developer/collections-app/design-docs/API.md) for the contract.
