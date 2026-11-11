import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from '../../generated/schema'
import { reloadForLogin } from './authReload'
import { NetworkError, toApiError } from './errors'

/**
 * Turns every non-2xx answer into a thrown ApiError and a failed fetch into a NetworkError, so
 * callers (TanStack Query) see failures as rejections instead of `{ error }` results.
 */
const errorMiddleware: Middleware = {
  async onResponse({ request, response }) {
    if (response.ok) return undefined
    // Only the API: /readyz is public and has no login to reload for.
    if (response.status === 401 && new URL(request.url).pathname.startsWith('/api/v1/')) {
      reloadForLogin()
    }
    const text = await response.clone().text()
    let body: unknown = text
    try {
      body = JSON.parse(text)
    } catch {
      // not JSON (e.g. the plain-text /readyz 503): keep the text
    }
    throw toApiError(response, body)
  },
  onError({ error }) {
    // Aborts are the caller's own doing (query cancelled), not a network failure.
    // Matched by name: the error may come from another realm (Node's fetch under jsdom).
    if ((error as { name?: string } | null)?.name === 'AbortError') return undefined
    return new NetworkError({ cause: error })
  },
}

function createApiClient() {
  const client = createClient<paths>({
    // Same origin, so the Vite proxy (dev) and Caddy (prod) just work. It has to be absolute
    // because Node's fetch (tests) rejects relative URLs; in the browser it is equivalent to "".
    baseUrl: globalThis.location?.origin ?? '',
    // Resolved per call, so tests and MSW can swap globalThis.fetch.
    fetch: (request) => globalThis.fetch(request),
  })
  client.use(errorMiddleware)
  return client
}

/** The one API client of the app. Every server call goes through it. */
export const api = createApiClient()

/** Returns the body of a successful call. Failures already threw; this only guards an empty 2xx body. */
export async function unwrap<T>(call: Promise<{ data?: T }>): Promise<T> {
  const { data } = await call
  if (data === undefined) throw new Error('The server returned an empty response')
  return data
}
