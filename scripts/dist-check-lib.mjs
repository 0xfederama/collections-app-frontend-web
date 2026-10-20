// Pure helpers for dist-check.mjs, kept separate so src/ tests can import them.
import { extname } from 'node:path'

// Vite appends an 8-char content hash to asset names (`DevUiRoute-ab12cd34.js`); it is stripped before
// the check so a hash that happens to contain "msw" does not fail the build.
const VITE_HASH = /-[A-Za-z0-9_-]{8}$/
const FORBIDDEN_NAME = /^(mockServiceWorker|msw|DevUi)/i

export function isForbiddenName(basename) {
  const stem = basename.slice(0, basename.length - extname(basename).length)
  return FORBIDDEN_NAME.test(stem.replace(VITE_HASH, ''))
}
