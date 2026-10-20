import { readSession, STORAGE_KEYS, writeSession } from '../../lib/storage'

/**
 * The folder the last created list went into, so the next "New list" opens there. Session
 * storage: gone when the tab closes, never sent anywhere. `null` means the top level.
 */
export const readLastListFolder = () =>
  readSession<string | null>(
    STORAGE_KEYS.listFolder,
    (raw) => (raw === null || typeof raw === 'string' ? raw : undefined),
    null,
  )

/** Remembers the folder a list was just created in (session only, see `readLastListFolder`). */
export const rememberListFolder = (folderId: string | null) =>
  writeSession(STORAGE_KEYS.listFolder, folderId)
