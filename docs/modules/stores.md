# stores

## Purpose

The fixed list of online stores (F-016) that a `stores` field (on books) and the Settings "Default store" draw from. Open Library is not a store (since `api-v0.13.0`); it is only a link under a book title. The list changes only with a deploy, so it is cached for a day.

## Key files

- `src/features/stores/api.ts`: `useStoreProviders()` and `storeKeys`.
- `src/features/stores/providers.ts`: `storeName`, `parseStoreKeys`, `joinStoreKeys`.
- `src/features/stores/StoreChoices.tsx`: multi-choice dropdown of providers.
- `src/components/ServiceIcon.tsx`: store icon tiles (display name, letter fallback).

## Interfaces

- `useStoreProviders()`: `GET /api/v1/store-providers`, data is `StoreProvider[]`, `staleTime` 24 h.
- `storeName(providers, key)`: display name, or the key as words before the list loads.
- `parseStoreKeys(text)` / `joinStoreKeys(keys)`: comma-separated text of a `stores` value.
- `StoreChoices`: ticked store picker used by the item editor.

## Gotchas

- Store tiles show the provider display name, not the raw key; an unknown key still renders a tile.
- Stores are excluded from list sort and from list filters. A pinned stores field shows its store tiles in list rows.
- Default store (Settings > Media, `preferred_store`, one `StoreKey`, `amazon` by default, a single-choice Select) is what the server puts in `stores` of a new book; each book can change its own list.
