# api

## Purpose

Pins the backend OpenAPI contract, generates TypeScript types/examples, and provides the API client, query defaults and MSW mocks.

## Key files

- `api/openapi.yaml`, `api/openapi.lock.json`: vendored contract and pin.
- `scripts/api-sync.mjs`, `api-check.mjs`: sync and offline drift check.
- `src/generated/schema.d.ts`, `examples.ts`: generated API types and examples.
- `src/lib/api/`: openapi-fetch client, errors and ETag helpers.
- `src/data/keys.ts`: query keys of every resource (`treeKeys`, `listKeys`, `itemKeys`, ..., `healthKeys`).
- `src/data/invalidate.ts`: `invalidateContent` (creates, trash, move) and `invalidateItemWrite` (item PATCH).
- `src/app/queryClient.ts`: `createQueryClient`, `shouldRetry`.
- `src/mocks/`: test handlers and dev fakes.

## Interfaces

- `npm run api:sync -- api-v0.N.0 [--from <backend checkout>]`, `npm run api:check`.
- `api`, `unwrap(call)`, `ApiError`, `NetworkError`, `failureKind` (`lib/api`).
- `GET /api/v1/tmdb/suggestions`, `POST /api/v1/items/{id}/lookup`, `GET /api/v1/store-providers`.
- `GET /api/v1/types` (read only: the web calls no type or field write route, F-023).
- `etag(resource, version)`, `ifMatch(resource, version)`.
- `invalidateContent(queryClient)`, `invalidateItemWrite(queryClient, listId)` (`data/invalidate.ts`).
- `createQueryClient()`, `shouldRetry(failureCount, error)`.

## Gotchas

- Current pinned contract: `api-v2.0.0` (web 2.21.0). Do not edit `api/openapi.yaml` or `src/generated/`; run `api:sync` and verify with `api:check`.
- F014 (`api-v0.10.1`): type definitions are API data; `src/mocks/types.ts` serves them read-only to tests and the dev worker. F-023 (web W1, `api-v3.0.0`): custom fields are gone; the field routes and their ETags are removed from the contract and the web, and types carry no `version`.
- F-016 (`api-v0.12.0`): Open Library book suggestions and lookup (`book_lookup_available`, `source_id`), the book type, `stores` fields and the store provider list. `api-v0.13.0`: setting `preferred_store` (one key, default `amazon`) replaces `preferred_stores`, Open Library is not a store, the book has no `first_publish_year`.
- F-022 (`api-v2.0.0`): custom types and the list pins (`pinned_fields`, `default_pinned_fields`) left the contract. Pins are fixed per built-in type in the web (`lists/pinned.ts`). Settings gained `owned_streaming_services` (absent = unchanged, `[]` = every service).
- F013 adds TMDB suggestions and item lookup, movie `director`, the movie-only `director` sort, settings `metadata_language`, and read-only `lookup_available`.
- Setting retention to `null` disables it; changing the value does not purge immediately. The API accepts 1–365 days; the UI offers Off, 7, 30 and 90.
- Mutations use ETags; 412 is not retried. Network and 5xx failures can retry once.
- Features import keys from `data/keys` and never re-export them; invalidate by key, never by string literal.
- See [API design docs](/Users/federico/Developer/collections-app/design-docs/API.md) for the contract.
