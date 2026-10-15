import { http, HttpResponse } from 'msw/http'
import { devItemStore } from './devItems'
import { problemResponse } from './problems'

const url = (path: string) => `${globalThis.location?.origin ?? ''}${path}`

type Version = { version: number; body: string; created_at: string }

/** Retention of the dev fake; the latest version is never pruned (D-052). */
export const DEV_HISTORY_LIMIT = 5
const MAX_BYTES = 1024 * 1024

const store = new Map<string, Version[]>()
const etag = (version: number) => ({ ETag: `"c-${version}"` })

const last = (list: Version[]) => list.at(-1) as Version

const versionsOf = (itemId: string): Version[] => {
  let list = store.get(itemId)
  if (!list) {
    list = [
      {
        version: 1,
        body: `# Notes\n\nA **sample** description with a [link](https://example.com).\n`,
        created_at: new Date(Date.now() - 3600_000).toISOString(),
      },
    ]
    store.set(itemId, list)
  }
  return list
}

const asContent = (itemId: string, v: Version | undefined) => ({
  item_id: itemId,
  version: v?.version ?? 0,
  body: v?.body ?? '',
  updated_at: v?.created_at ?? null,
})

/** Appends a version (identical body = no new version) and prunes beyond the limit. */
function append(itemId: string, body: string): Version {
  const list = versionsOf(itemId)
  const latest = last(list)
  if (latest.body === body) return latest
  const next = { version: latest.version + 1, body, created_at: new Date().toISOString() }
  list.push(next)
  while (list.length > DEV_HISTORY_LIMIT) list.shift()
  return next
}

/**
 * Dev fake of the content endpoints (`VITE_API_MOCKS=1` worker only): per-item versions with
 * retention, identical-body no-op, 413, 412 on a stale ETag, version GET and restore.
 */
export const devContentHandlers = [
  http.get(url('/api/v1/items/:id/content'), ({ params }) => {
    const id = String(params.id)
    if (!devItemStore.find(id)) return problemResponse(404, 'not_found')
    const list = versionsOf(id)
    const latest = last(list)
    return HttpResponse.json(asContent(id, latest), { headers: etag(latest.version) })
  }),

  http.put(url('/api/v1/items/:id/content'), async ({ params, request }) => {
    const id = String(params.id)
    if (!devItemStore.find(id)) return problemResponse(404, 'not_found')
    const header = request.headers.get('If-Match')
    if (!header) return problemResponse(428, 'precondition_required')
    const list = versionsOf(id)
    const current = last(list).version
    if (header !== `"c-${current}"`) {
      return problemResponse(412, 'version_conflict', { current_version: current })
    }
    const { body } = (await request.json()) as { body: string }
    if (new TextEncoder().encode(body).length > MAX_BYTES)
      return problemResponse(413, 'payload_too_large')
    const saved = append(id, body)
    return HttpResponse.json(asContent(id, saved), { headers: etag(saved.version) })
  }),

  http.get(url('/api/v1/items/:id/content/versions'), ({ params }) => {
    const id = String(params.id)
    if (!devItemStore.find(id)) return problemResponse(404, 'not_found')
    const data = [...versionsOf(id)].reverse().map((v) => ({
      version: v.version,
      size_bytes: new TextEncoder().encode(v.body).length,
      created_at: v.created_at,
    }))
    return HttpResponse.json({ data })
  }),

  http.get(url('/api/v1/items/:id/content/versions/:version'), ({ params }) => {
    const id = String(params.id)
    if (!devItemStore.find(id)) return problemResponse(404, 'not_found')
    const found = versionsOf(id).find((v) => v.version === Number(params.version))
    if (!found) return problemResponse(404, 'not_found')
    return HttpResponse.json(asContent(id, found), { headers: etag(found.version) })
  }),

  http.post(url('/api/v1/items/:id/content/restore'), async ({ params, request }) => {
    const id = String(params.id)
    if (!devItemStore.find(id)) return problemResponse(404, 'not_found')
    const header = request.headers.get('If-Match')
    if (!header) return problemResponse(428, 'precondition_required')
    const list = versionsOf(id)
    const current = last(list).version
    if (header !== `"c-${current}"`) {
      return problemResponse(412, 'version_conflict', { current_version: current })
    }
    const { version } = (await request.json()) as { version: number }
    const source = list.find((v) => v.version === version)
    if (!source) return problemResponse(404, 'not_found')
    const saved = append(id, source.body)
    return HttpResponse.json(asContent(id, saved), { headers: etag(saved.version) })
  }),
]
