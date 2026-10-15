import { http, HttpResponse } from 'msw/http'
import { problemResponse } from '../../../mocks/problems'
import { server } from '../../../mocks/server'

const ITEM = '7c1e5a10-0000-4000-8000-000000000101'
const contentUrl = `${location.origin}/api/v1/items/${ITEM}/content`

export interface StoredVersion {
  version: number
  body: string
  created_at: string
}

export interface ContentCall {
  ifMatch: string | null
  body: Record<string, unknown>
}

const at = (minutes: number) => new Date(Date.UTC(2026, 9, 14, 9, minutes)).toISOString()

/**
 * A small stateful fake of the content endpoints for one item (test-only): versions, `If-Match`
 * checks (412), identical-body no-op, restore, and a log of every write. Install with `use()`.
 */
export function createContentBackend(
  initial: StoredVersion[] = [
    { version: 1, body: 'Old', created_at: at(0) },
    { version: 2, body: '# Notes\n\nGreat film, rewatch in 4K.', created_at: at(15) },
  ],
) {
  const versions = [...initial]
  const puts: ContentCall[] = []
  const restores: ContentCall[] = []
  const counts = { versionLists: 0, gets: 0 }
  /** Versions answered with 404 on GET (as if pruned). */
  const pruned = new Set<number>()
  const current = () => versions[versions.length - 1] as StoredVersion
  const asContent = (v: StoredVersion) => ({
    item_id: ITEM,
    version: v.version,
    body: v.body,
    updated_at: v.created_at,
  })
  const etag = (v: StoredVersion) => ({ ETag: `"c-${v.version}"` })
  const append = (body: string) => {
    const next = {
      version: current().version + 1,
      body,
      created_at: at(30 + versions.length),
    }
    versions.push(next)
    return next
  }

  const handlers = [
    http.get(contentUrl, () => {
      counts.gets++
      return HttpResponse.json(asContent(current()), { headers: etag(current()) })
    }),
    http.put(contentUrl, async ({ request }) => {
      const call = {
        ifMatch: request.headers.get('If-Match'),
        body: (await request.json()) as Record<string, unknown>,
      }
      puts.push(call)
      if (call.ifMatch !== `"c-${current().version}"`) {
        return problemResponse(412, 'version_conflict', { current_version: current().version })
      }
      const saved = call.body.body === current().body ? current() : append(String(call.body.body))
      return HttpResponse.json(asContent(saved), { headers: etag(saved) })
    }),
    http.get(`${contentUrl}/versions`, () => {
      counts.versionLists++
      return HttpResponse.json({
        data: [...versions].reverse().map((v) => ({
          version: v.version,
          size_bytes: new TextEncoder().encode(v.body).length,
          created_at: v.created_at,
        })),
      })
    }),
    http.get(`${contentUrl}/versions/:version`, ({ params }) => {
      const found = versions.find((v) => v.version === Number(params.version))
      if (!found || pruned.has(found.version)) return problemResponse(404, 'not_found')
      return HttpResponse.json(asContent(found))
    }),
    http.post(`${contentUrl}/restore`, async ({ request }) => {
      const call = {
        ifMatch: request.headers.get('If-Match'),
        body: (await request.json()) as Record<string, unknown>,
      }
      restores.push(call)
      if (call.ifMatch !== `"c-${current().version}"`) {
        return problemResponse(412, 'version_conflict', { current_version: current().version })
      }
      const source = versions.find((v) => v.version === call.body.version)
      if (!source || pruned.has(source.version)) return problemResponse(404, 'not_found')
      const saved = source.body === current().body ? current() : append(source.body)
      return HttpResponse.json(asContent(saved), { headers: etag(saved) })
    }),
  ]

  return {
    versions,
    puts,
    restores,
    counts,
    pruned,
    current,
    /** Another client saves: the server moves on without the page knowing. */
    externalSave: (body: string) => append(body),
    use: () => server.use(...handlers),
  }
}
