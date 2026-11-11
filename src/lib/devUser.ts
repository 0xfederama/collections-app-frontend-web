/**
 * Cookie the backend reads to pick a dev/test identity (F-027, `GET /me` → `dev_identities`).
 * Only dev/test servers send identities, so the switcher that writes it is never shown in prod.
 */
const DEV_USER_COOKIE = 'dev_user'

const MAX_AGE_SECONDS = 30 * 24 * 60 * 60

/** The `Set-Cookie`-style string for `document.cookie`: the e-mail is encoded, the path is the whole app. */
export function devUserCookie(email: string): string {
  return `${DEV_USER_COOKIE}=${encodeURIComponent(email)}; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}`
}

/**
 * Makes `email` the dev identity and reloads the page, so every cache starts clean. The reload is
 * injectable for tests; the default is the real page reload.
 */
export function switchDevUser(
  email: string,
  reload: () => void = () => globalThis.location.reload(),
): void {
  document.cookie = devUserCookie(email)
  reload()
}
