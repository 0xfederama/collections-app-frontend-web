# stores

## Purpose

The fixed list of online stores (F-016) that a `stores` field (on books) and the Settings "Preferred stores" draw from. The list changes only with a deploy, so it is cached for a day.

## Key files

- `src/features/stores/api.ts`: `useStoreProviders()` and `storeKeys`.
- `src/features/stores/providers.ts`: `storeName`, `parseStoreKeys`, `joinStoreKeys`.
- `src/features/stores/StoreChoices.tsx`: multi-choice dropdown of providers.
- `src/components/ServiceIcon.tsx`: store icon tiles (display name, letter fallback).

## Interfaces

- `useStoreProviders()`: `GET /api/v1/store-providers`, data is `StoreProvider[]`, `staleTime` 24 h.
- `storeName(providers, key)`: display name, or the key as words before the list loads.
- `parseStoreKeys(text)` / `joinStoreKeys(keys)`: comma-separated text of a `stores` value.
- `StoreChoices`: ticked store picker used by the item editor and Settings.

## Gotchas

- Store tiles show the provider display name, not the raw key; an unknown key still renders a tile.
- Stores are excluded from list sort and from list filters. A pinned stores field shows its store tiles in list rows.
- Preferred stores (Settings > Media, `preferred_stores`) seed new books; each book can change its own list.
