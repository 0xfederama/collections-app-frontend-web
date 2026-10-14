import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { devImageHandlers } from './devImages'
import { devItemDetailHandlers } from './devItemDetail'
import { devItemStore } from './devItems'
import { server } from './server'

const api = (path: string) => `${location.origin}/api/v1${path}`

beforeEach(() => {
  server.use(...devImageHandlers, ...devItemDetailHandlers)
  vi.stubGlobal('createImageBitmap', async () => ({ width: 30, height: 20 }))
  URL.createObjectURL = vi.fn(() => 'blob:test/1')
})
afterEach(() => vi.unstubAllGlobals())

/** A fresh item id each test would need a store reset; the store is shared, so read the version. */
function pick() {
  const summary = devItemStore.all().find((item) => !item.image) ?? devItemStore.all()[0]!
  return summary
}
const put = (id: string, version: number, body: BodyInit, headers: Record<string, string> = {}) =>
  fetch(api(`/items/${id}/image`), {
    method: 'PUT',
    headers: { 'If-Match': `"i-${version}"`, ...headers },
    body,
  })

describe('AT-07 dev image fake', () => {
  it('a URL bumps the version and the item shows source url', async () => {
    const { id, version } = pick()
    const res = await put(id, version, JSON.stringify({ url: 'https://example.com/a.jpg' }), {
      'Content-Type': 'application/json',
    })
    expect(res.status).toBe(200)
    const item = await res.json()
    expect(item.version).toBe(version + 1)
    expect(item.image).toEqual({ source: 'url', url: 'https://example.com/a.jpg' })
    expect(res.headers.get('ETag')).toBe(`"i-${version + 1}"`)
  })

  it('answers 412 for a stale version, 428 without If-Match and 404 for unknown items', async () => {
    const { id, version } = pick()
    const body = JSON.stringify({ url: 'https://example.com/b.jpg' })
    const json = { 'Content-Type': 'application/json' }
    const stale = await put(id, version - 1, body, json)
    expect(stale.status).toBe(412)
    expect((await stale.json()).code).toBe('version_conflict')
    const none = await fetch(api(`/items/${id}/image`), { method: 'PUT', headers: json, body })
    expect(none.status).toBe(428)
    const gone = await put('00000000-0000-4000-8000-00000000dead', 1, body, json)
    expect(gone.status).toBe(404)
  })

  it('rejects a non-http(s) address with a 422 on `url`', async () => {
    const { id, version } = pick()
    const res = await put(id, version, JSON.stringify({ url: 'ftp://x.example/a.jpg' }), {
      'Content-Type': 'application/json',
    })
    expect(res.status).toBe(422)
    expect((await res.json()).errors[0].field).toBe('url')
  })

  it('DELETE removes the image and bumps the version; a second DELETE is a no-op', async () => {
    const { id, version } = pick()
    const json = { 'Content-Type': 'application/json' }
    const set = await put(id, version, JSON.stringify({ url: 'https://example.com/c.jpg' }), json)
    const current = (await set.json()).version as number
    const del = await fetch(api(`/items/${id}/image`), {
      method: 'DELETE',
      headers: { 'If-Match': `"i-${current}"` },
    })
    expect(del.status).toBe(200)
    const removed = await del.json()
    expect(removed.image).toBeNull()
    expect(removed.version).toBe(current + 1)
    const again = await fetch(api(`/items/${id}/image`), {
      method: 'DELETE',
      headers: { 'If-Match': `"i-${current + 1}"` },
    })
    expect((await again.json()).version).toBe(current + 1)
  })

  // Multipart upload is not testable here: under jsdom `FormData`/`File` come from jsdom, and node's
  // fetch/undici cannot send them (content-length mismatch) nor `request.formData()` parse them
  // back (realm mismatch, `file instanceof File` is false in devImages.ts). Covered in the browser.
})
