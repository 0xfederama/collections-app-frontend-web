import { etag, NetworkError } from '../../../lib/api'
import { reloadForLogin } from '../../../lib/api/authReload'
import { toApiError } from '../../../lib/api/errors'
import type { Item } from '../api'

export interface UploadOptions {
  itemId: string
  /** The version the user is editing; sent as `If-Match`. */
  version: number
  file: File
  /** Fraction sent so far, 0 to 1. */
  onProgress?: (fraction: number) => void
  signal?: AbortSignal
}

/**
 * `PUT /items/{id}/image` as multipart, with upload progress.
 *
 * This is the one place the app does not use `fetch` / `lib/api`: `fetch` cannot report how many
 * bytes of a request body were sent (streaming request bodies need HTTP/2 and are not usable
 * cross-browser), while `XMLHttpRequest.upload` can. Everything else about the call matches the
 * client: same URL, `If-Match`, and failures become `ApiError` / `NetworkError`.
 */
export function putImageFile({ itemId, version, file, onProgress, signal }: UploadOptions) {
  return new Promise<Item>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', `${globalThis.location?.origin ?? ''}/api/v1/items/${itemId}/image`)
    xhr.setRequestHeader('If-Match', etag('item', version))
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.responseType = 'text'

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      let body: unknown = xhr.responseText
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        // not JSON: keep the text
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(body as Item)
      if (xhr.status === 401) reloadForLogin()
      const headers: Record<string, string> = {}
      const requestId = xhr.getResponseHeader('X-Request-Id')
      if (requestId) headers['X-Request-Id'] = requestId
      reject(
        toApiError(
          new Response(null, { status: xhr.status, statusText: xhr.statusText, headers }),
          body,
        ),
      )
    }
    xhr.onerror = xhr.ontimeout = () => reject(new NetworkError())
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))
    signal?.addEventListener('abort', () => xhr.abort(), { once: true })

    const form = new FormData()
    form.append('file', file)
    xhr.send(form)
  })
}
