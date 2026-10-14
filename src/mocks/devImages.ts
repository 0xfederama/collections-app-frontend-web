import { http, HttpResponse } from 'msw/http'
import type { components } from '../generated/schema'
import { problemResponse } from './problems'
import { devItemStore } from './devItems'

type Item = components['schemas']['Item']

const url = (path: string) => `${globalThis.location?.origin ?? ''}${path}`
const MAX_BYTES = 10 * 1024 * 1024

/** The type by magic bytes, like the server (an extension or a `Content-Type` proves nothing). */
async function sniff(file: File): Promise<boolean> {
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const jpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  const png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
  const webp =
    [0x52, 0x49, 0x46, 0x46].every((v, i) => b[i] === v) && b[8] === 0x57 && b[9] === 0x45
  return jpeg || png || webp
}

/**
 * Dev fake of `PUT`/`DELETE /items/{id}/image` (`VITE_API_MOCKS=1` worker only). Uploads live in
 * memory as object URLs; the item's summary gets the thumbnail so the list shows it. The detail
 * answer is built by the item fake (`devItemDetail.ts`), then given the richer image. A later
 * `GET /items/{id}` goes through `fullItem`, which only knows `{ url }`, so a reloaded item shows
 * an uploaded image as `source: "url"`: good enough for the UI.
 */
export const devImageHandlers = [
  http.put(url('/api/v1/items/:id/image'), async ({ params, request }) => {
    const summary = devItemStore.find(String(params.id))
    if (!summary) return problemResponse(404, 'not_found')
    const header = request.headers.get('If-Match')
    if (!header) return problemResponse(428, 'precondition_required')
    if (header !== `"i-${summary.version}"`) {
      return problemResponse(412, 'version_conflict', { current_version: summary.version })
    }

    let image: NonNullable<Item['image']>
    let thumbnail: string | undefined
    if (request.headers.get('Content-Type')?.includes('application/json')) {
      const body = (await request.json()) as { url?: unknown }
      const address = typeof body.url === 'string' ? body.url.trim() : ''
      if (!/^https?:\/\/[^/\s]+/.test(address)) {
        return problemResponse(422, 'validation_failed', {
          errors: [{ field: 'url', message: 'must be an http or https URL' }],
        })
      }
      if (summary.image?.url === address) {
        return HttpResponse.json(await currentItem(summary.id), { headers: { ETag: header } })
      }
      image = { source: 'url', url: address }
    } else {
      const file = (await request.formData()).get('file')
      if (!(file instanceof File)) {
        return problemResponse(422, 'validation_failed', {
          errors: [{ field: 'file', message: 'is required' }],
        })
      }
      if (file.size > MAX_BYTES) return problemResponse(413, 'payload_too_large')
      if (!(await sniff(file))) return problemResponse(415, 'unsupported_media_type')
      const objectUrl = URL.createObjectURL(file)
      thumbnail = objectUrl
      const bitmap = await createImageBitmap(file).catch(() => null)
      image = {
        source: 'upload',
        attachment_id: crypto.randomUUID(),
        url: objectUrl,
        thumbnail_url: objectUrl,
        width: bitmap?.width ?? 0,
        height: bitmap?.height ?? 0,
        original_filename: file.name,
      }
    }
    return respond(summary.id, image, thumbnail)
  }),

  http.delete(url('/api/v1/items/:id/image'), async ({ params, request }) => {
    const summary = devItemStore.find(String(params.id))
    if (!summary) return problemResponse(404, 'not_found')
    const header = request.headers.get('If-Match')
    if (!header) return problemResponse(428, 'precondition_required')
    if (header !== `"i-${summary.version}"`) {
      return problemResponse(412, 'version_conflict', { current_version: summary.version })
    }
    // Nothing to remove: 200 without a version bump (D-064).
    if (!summary.image)
      return HttpResponse.json(await currentItem(summary.id), { headers: { ETag: header } })
    return respond(summary.id, null)
  }),
]

/** The full item as the detail fake serves it (this goes back through the worker). */
async function currentItem(id: string): Promise<Item> {
  return (await fetch(url(`/api/v1/items/${id}`))).json()
}

async function respond(id: string, image: Item['image'], thumbnail?: string) {
  const summary = devItemStore.find(id)
  if (!summary) return problemResponse(404, 'not_found')
  const next = {
    ...summary,
    image: image ? { url: image.url, ...(thumbnail ? { thumbnail_url: thumbnail } : {}) } : null,
    version: summary.version + 1,
    updated_at: new Date().toISOString(),
  }
  devItemStore.replace(next)
  const item = { ...(await currentItem(id)), image }
  return HttpResponse.json(item, { headers: { ETag: `"i-${next.version}"` } })
}
