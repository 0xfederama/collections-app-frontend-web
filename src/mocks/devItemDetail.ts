import { http, HttpResponse } from 'msw/http'
import type { components } from '../generated/schema'
import { devTreeState } from './devData'
import { kindFields } from '../features/items/kinds'
import { devItemStore } from './devItems'
import { problemResponse } from './problems'

type Item = components['schemas']['Item']
type ItemSummary = components['schemas']['ItemSummary']
type Folder = components['schemas']['Folder']

const url = (path: string) => `${globalThis.location?.origin ?? ''}${path}`

/** Stable small number from an id, to vary the sample data without randomness. */
const seed = (id: string) => [...id].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 9973, 7)

const metadataFor = (summary: ItemSummary): Record<string, unknown> => {
  const n = seed(summary.id)
  const sparse = n % 5 === 0 // every fifth item has no kind details at all
  if (sparse) return {}
  switch (summary.kind) {
    case 'movie':
      return {
        release_year: 1990 + (n % 34),
        runtime_minutes: 90 + (n % 70),
        imdb_url: 'https://www.imdb.com/title/tt0133093/',
        streaming: {
          country: n % 2 ? 'IT' : 'US',
          platforms: ['Netflix', 'Prime Video'],
        },
      }
    case 'tv_show':
      return {
        first_air_year: 2015 + (n % 8),
        ...(n % 2 ? { end_year: 2024 } : {}),
        seasons: 1 + (n % 6),
        streaming: { country: 'IT', platforms: ['Disney+'] },
      }
    case 'motorcycle':
      return {
        make: 'Ducati',
        model: 'Monster',
        model_year: 2021,
        segment: 'naked',
        displacement_cc: 937,
        power_hp: 111,
        torque_nm: 93.1,
        wet_weight_kg: 188,
        seat_height_mm: 820,
        license_class: 'A',
      }
    case 'car':
      return {
        make: 'Mazda',
        model: 'MX-5',
        trim: 'Exceed',
        model_year: 2022,
        body_type: 'roadster',
        fuel_type: 'petrol',
        transmission: 'manual',
        power_hp: 184,
        seats: 2,
      }
    case 'camera':
      return {
        make: 'Fujifilm',
        model: 'X100VI',
        release_year: 2024,
        camera_type: 'compact',
        sensor_format: 'aps_c',
        megapixels: 40.2,
        lens_mount: 'Fixed',
        weight_g: 521,
      }
    default:
      return {}
  }
}

const BODY = `## Notes

Bought **second hand**, still in great shape. See the [official page](https://example.com) or
[search it](https://www.google.com/search?q=notes).

- First point
- Second point

| Spec | Value |
| ---- | ----- |
| Colour | Green |

A broken link: [x](javascript:alert(1)). Raw HTML <script>alert(1)</script> is not rendered.
`

/** Kind details and official site of items created or edited in this session. */
const extras = new Map<
  string,
  { metadata: Record<string, unknown>; official_website_url: string | null }
>()

function fullItem(summary: ItemSummary): Item {
  const list = devTreeState.lists.find((l) => l.id === summary.list_id)
  const folders = new Map<string, Folder>(devTreeState.folders.map((f) => [f.id, f]))
  const path: components['schemas']['PathSegment'][] = []
  for (let id = list?.folder_id ?? null; id; id = folders.get(id)?.parent_folder_id ?? null) {
    path.unshift({ type: 'folder', id, name: folders.get(id)?.name ?? '' })
  }
  if (list) path.push({ type: 'list', id: list.id, name: list.name })
  const { image, ...rest } = summary
  return {
    ...rest,
    image: image ? { source: 'url', url: image.url } : null,
    official_website_url:
      extras.get(summary.id)?.official_website_url ??
      (seed(summary.id) % 3 === 0 ? 'https://example.com/product' : null),
    content_version: 1,
    metadata: extras.get(summary.id)?.metadata ?? metadataFor(summary),
    path,
  } as Item
}

type FieldIssue = { field: string; message: string }
type Body = Record<string, unknown>
const KINDS = ['generic', 'movie', 'tv_show', 'motorcycle', 'car', 'camera']

/** A light version of the server's rules (DATA_MODEL §2), enough to exercise the form's 422 paths. */
function validateBody(body: Body, kind: string, metadata: Body | undefined): FieldIssue[] {
  const issues: FieldIssue[] = []
  const add = (field: string, message: string) => issues.push({ field, message })
  if ('title' in body && (typeof body.title !== 'string' || !body.title.trim())) {
    add('title', 'Title must not be blank.')
  }
  if ('kind' in body && !KINDS.includes(String(body.kind))) add('kind', 'Unknown kind.')
  const price = body.price as { min: string | null; max: string | null; currency?: string } | null
  if (price) {
    if (price.min === null && price.max === null) add('price', 'Set a minimum or a maximum.')
    else if (!price.currency) add('price.currency', 'Currency is required with a price.')
    if (price.min && price.max && Number(price.min) > Number(price.max)) {
      add('price.max', 'Maximum must not be lower than the minimum.')
    }
  }
  const url = body.official_website_url
  if (typeof url === 'string' && !/^https?:\/\//.test(url)) {
    add('official_website_url', 'Must be an http or https address.')
  }
  for (const [key, value] of Object.entries(metadata ?? {})) {
    const field = kindFields[kind as keyof typeof kindFields]?.find((f) => f.key === key)
    if (!field) continue
    if (typeof value === 'number' && field.min !== undefined && value < field.min) {
      add(`metadata.${key}`, `Must be at least ${field.min}.`)
    }
    if (typeof value === 'number' && field.max !== undefined && value > field.max) {
      add(`metadata.${key}`, `Must be at most ${field.max}.`)
    }
  }
  return issues
}

const unknownKey = (body: Body, allowed: string[]) =>
  Object.keys(body).find((key) => !allowed.includes(key))
const ITEM_KEYS = [
  'title',
  'kind',
  'summary',
  'status',
  'price',
  'official_website_url',
  'metadata',
]

/**
 * Dev fake of `GET`/`PATCH`/`DELETE /items/{id}`, `POST /items/{id}/move` and `GET …/content`, on top of
 * the item store of `devItems.ts` (`VITE_API_MOCKS=1` worker only). Every item has kind details
 * (except every fifth), no official site except every third, and a short Markdown description.
 */
export const devItemDetailHandlers = [
  http.post(url('/api/v1/lists/:id/items'), async ({ params, request }) => {
    const listId = String(params.id)
    if (!devItemStore.has(listId)) return problemResponse(404, 'not_found')
    const body = (await request.json()) as Body
    const unknown = unknownKey(body, ITEM_KEYS)
    if (unknown) return problemResponse(400, 'unknown_field', { detail: unknown })
    const kind = String(body.kind ?? 'generic')
    const issues = validateBody({ ...body, title: body.title ?? '' }, kind, body.metadata as Body)
    if (issues.length > 0) return problemResponse(422, 'validation_failed', { errors: issues })
    const now = new Date().toISOString()
    const created = {
      id: crypto.randomUUID(),
      list_id: listId,
      title: String(body.title).trim(),
      kind,
      summary: (body.summary as string | null) ?? null,
      status: (body.status as string | null) ?? null,
      image: null,
      price: (body.price as ItemSummary['price']) ?? null,
      official_website_url: null,
      content_version: 0,
      sort_order: 0,
      version: 1,
      created_at: now,
      updated_at: now,
    } as ItemSummary
    devItemStore.append(created)
    extras.set(created.id, {
      metadata: (body.metadata as Body | undefined) ?? {},
      official_website_url: (body.official_website_url as string | null) ?? null,
    })
    return HttpResponse.json(fullItem(created), {
      status: 201,
      headers: { ETag: `"i-1"`, Location: `/api/v1/items/${created.id}` },
    })
  }),

  http.patch(url('/api/v1/items/:id'), async ({ params, request }) => {
    const summary = devItemStore.find(String(params.id))
    if (!summary) return problemResponse(404, 'not_found')
    const header = request.headers.get('If-Match')
    if (!header) return problemResponse(428, 'precondition_required')
    if (header !== `"i-${summary.version}"`) {
      return problemResponse(412, 'version_conflict', { current_version: summary.version })
    }
    const body = (await request.json()) as Body
    const unknown = unknownKey(body, ITEM_KEYS)
    if (unknown) return problemResponse(400, 'unknown_field', { detail: unknown })
    const current = fullItem(summary)
    const kind = String(body.kind ?? summary.kind)
    const metadata = (
      'metadata' in body ? body.metadata : kind === summary.kind ? current.metadata : {}
    ) as Body
    const issues = validateBody(body, kind, metadata)
    if (issues.length > 0) return problemResponse(422, 'validation_failed', { errors: issues })
    const { official_website_url, metadata: _ignored, ...summaryPatch } = body
    void _ignored
    const changed = Object.keys(body).length > 0
    const next = {
      ...summary,
      ...summaryPatch,
      version: changed ? summary.version + 1 : summary.version,
      updated_at: changed ? new Date().toISOString() : summary.updated_at,
    } as ItemSummary
    devItemStore.replace(next)
    extras.set(next.id, {
      metadata,
      official_website_url:
        official_website_url === undefined
          ? current.official_website_url
          : (official_website_url as string | null),
    })
    return HttpResponse.json(fullItem(next), { headers: { ETag: `"i-${next.version}"` } })
  }),

  http.get(url('/api/v1/items/:id'), ({ params }) => {
    const summary = devItemStore.find(String(params.id))
    if (!summary) return problemResponse(404, 'not_found')
    const item = fullItem(summary)
    return HttpResponse.json(item)
  }),

  http.get(url('/api/v1/items/:id/content'), ({ params }) => {
    const summary = devItemStore.find(String(params.id))
    if (!summary) return problemResponse(404, 'not_found')
    const empty = seed(summary.id) % 4 === 0
    return HttpResponse.json({
      item_id: summary.id,
      version: empty ? 0 : 1,
      body: empty ? '' : BODY,
      updated_at: empty ? null : summary.updated_at,
    })
  }),

  http.delete(url('/api/v1/items/:id'), ({ params, request }) => {
    const summary = devItemStore.find(String(params.id))
    if (!summary) return problemResponse(404, 'not_found')
    if (request.headers.get('If-Match') !== `"i-${summary.version}"`) {
      return problemResponse(412, 'version_conflict', { current_version: summary.version })
    }
    devItemStore.remove(summary.id)
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(url('/api/v1/items/:id/move'), async ({ params, request }) => {
    const summary = devItemStore.find(String(params.id))
    if (!summary) return problemResponse(404, 'not_found')
    if (request.headers.get('If-Match') !== `"i-${summary.version}"`) {
      return problemResponse(412, 'version_conflict', { current_version: summary.version })
    }
    const { list_id } = (await request.json()) as { list_id: string }
    if (!devTreeState.lists.some((l) => l.id === list_id)) {
      return problemResponse(409, 'destination_unavailable')
    }
    devItemStore.remove(summary.id)
    devItemStore.append({ ...summary, list_id, version: summary.version + 1 })
    return HttpResponse.json(fullItem({ ...summary, list_id, version: summary.version + 1 }))
  }),
]
