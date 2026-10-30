import type { StoreProvider } from './api'

/**
 * The display name of a store key ("Bookshop.org" for `bookshop`). Until the provider list has
 * loaded, the key reads as words, so a tile is never blank.
 */
export function storeName(providers: readonly StoreProvider[] | undefined, key: string): string {
  return providers?.find((provider) => provider.key === key)?.name ?? key.replaceAll('_', ' ')
}

/**
 * Store keys in the providers' display order (the API's fixed list); keys the list does not know
 * come last, in their given order. Before the list has loaded the keys stay as stored.
 */
export function sortStoreKeys(
  providers: readonly StoreProvider[] | undefined,
  keys: readonly string[],
): string[] {
  if (!providers?.length) return [...keys]
  const rank = (key: string) => {
    const at = providers.findIndex((provider) => provider.key === key)
    return at === -1 ? Number.MAX_SAFE_INTEGER : at
  }
  return keys
    .map((key, index) => ({ key, index, rank: rank(key) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.key)
}

/**
 * The comma-separated text of a `stores` value (inputs hold text): trimmed, no empty entries, each
 * key once, in the order typed.
 */
export function parseStoreKeys(text: string): string[] {
  const out: string[] = []
  for (const part of text.split(',')) {
    const key = part.trim()
    if (key && !out.includes(key)) out.push(key)
  }
  return out
}

export const joinStoreKeys = (keys: readonly string[]): string => keys.join(', ')
