// Every persisted UI preference lives under the `collection:` prefix, like the theme key.
export const STORAGE_KEYS = {
  treeExpanded: 'collection:tree-expanded',
  sidebar: 'collection:sidebar',
} as const

/**
 * Reads and parses a stored JSON value. Storage can be blocked and the value can be garbage
 * (older version, hand-edited), so any failure falls back instead of throwing.
 */
export function readStored<T>(key: string, parse: (raw: unknown) => T | undefined, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return parse(JSON.parse(raw)) ?? fallback
  } catch {
    return fallback
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be blocked or full; the preference then lasts for this page load only.
  }
}
