import { readSession, STORAGE_KEYS, writeSession } from '../storage'

/** A second 401 within this window does not reload again (a LAN without Access answers 401 forever). */
export const AUTH_RELOAD_COOLDOWN_MS = 30_000

const parseTime = (raw: unknown) => (typeof raw === 'number' ? raw : undefined)

/**
 * An `/api/v1` call answered 401: the Cloudflare Access session ended, so reload the page and let
 * Access show its login. Remembers the time in `sessionStorage` and does not reload again within
 * 30 s, so the failure then surfaces normally instead of looping. Returns whether it reloaded.
 */
export function reloadForLogin(now: number = Date.now()): boolean {
  const last = readSession(STORAGE_KEYS.authReload, parseTime, 0)
  if (last > 0 && now - last >= 0 && now - last < AUTH_RELOAD_COOLDOWN_MS) return false
  writeSession(STORAGE_KEYS.authReload, now)
  globalThis.location.reload()
  return true
}
