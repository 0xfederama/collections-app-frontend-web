import type { StoreProvider } from './api'

/**
 * The display name of a store key ("Bookshop.org" for `bookshop`). Until the provider list has
 * loaded, the key reads as words, so a tile is never blank.
 */
export function storeName(providers: readonly StoreProvider[] | undefined, key: string): string {
  return providers?.find((provider) => provider.key === key)?.name ?? key.replaceAll('_', ' ')
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
