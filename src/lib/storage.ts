// Every persisted UI preference lives under the `collection:` prefix, like the theme key.
export const STORAGE_KEYS = {
  treeExpanded: 'collection:tree-expanded',
  sidebar: 'collection:sidebar',
  /** Ids of the lists whose description section is collapsed (default: expanded). */
  listDescriptionCollapsed: 'collection:list-description-collapsed',
  /** Folder the last created list went into, preselected in the "New list" dialog. Session only. */
  listFolder: 'collection:list-folder',
} as const

/**
 * Reads and parses a stored JSON value. Storage can be blocked and the value can be garbage
 * (older version, hand-edited), so any failure falls back instead of throwing.
 */
export function readStored<T>(key: string, parse: (raw: unknown) => T | undefined, fallback: T): T {
  return readFrom(localStorage, key, parse, fallback)
}

/**
 * The same, on `sessionStorage`: gone when the tab closes, like a cookie with no expiry but
 * without ever being sent to the server. Used for what should last one browsing session only.
 */
export function readSession<T>(
  key: string,
  parse: (raw: unknown) => T | undefined,
  fallback: T,
): T {
  return readFrom(sessionStorage, key, parse, fallback)
}

function readFrom<T>(
  store: Pick<Storage, 'getItem'>,
  key: string,
  parse: (raw: unknown) => T | undefined,
  fallback: T,
): T {
  try {
    const raw = store.getItem(key)
    if (raw === null) return fallback
    return parse(JSON.parse(raw)) ?? fallback
  } catch {
    // Blocked or private-mode storage, or garbage in it: the default stands.
    return fallback
  }
}

export function writeStored(key: string, value: unknown): void {
  writeTo(localStorage, key, value)
}

/** The same, on `sessionStorage` (see {@link readSession}). */
export function writeSession(key: string, value: unknown): void {
  writeTo(sessionStorage, key, value)
}

function writeTo(store: Pick<Storage, 'setItem'>, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be blocked or full; the preference then lasts for this page load only.
  }
}
