import { http, HttpResponse } from 'msw/http'
import type { components } from '../generated/schema'
import { devTreeState } from './devData'
import { devItemStore } from './devItems'
import { problemResponse } from './problems'

type Item = components['schemas']['Item']
type ItemSummary = components['schemas']['ItemSummary']
type Folder = components['schemas']['Folder']

const url = (path: string) => `${globalThis.location?.origin ?? ''}${path}`

/** Stable small number from an id, to vary the sample data without randomness. */
const seed = (id: string) => [...id].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 9973, 7)

const metadataFor = (summary: Pick<ItemSummary, 'id' | 'kind'>): Record<string, unknown> => {
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
          paid_platforms: ['Prime Video'],
        },
      }
    case 'tv_show':
      return {
        first_air_year: 2015 + (n % 8),
        ...(n % 2 ? { end_year: 2024 } : {}),
        seasons: 1 + (n % 6),
        episodes_per_season: 8 + (n % 5),
        episode_minutes: 45,
        streaming: { country: 'IT', platforms: ['Disney+'] },
      }
    case 'motorcycle':
      return {
        model_year: 2021,
        displacement_cc: 937,
        power_hp: 111,
        license_class: 'A',
      }
    case 'car':
      return {
        model_year: 2022,
        fuel_type: 'petrol',
        power_hp: 184,
      }
    case 'camera':
      return {
        camera_type: 'mirrorless',
        release_year: 2024,
        sensor_format: 'aps_c',
        megapixels: 40.2,
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

/** Kind details and website of items created or edited in this session (`kind`: the one the details belong to). */
const extras = new Map<
  string,
  { kind: string; metadata: Record<string, unknown>; website: string | null }
>()

type PriceInput = {
  amount?: string
  min?: string | null
  max?: string | null
  currency: string
} | null

/** A price request as the server stores it: always `min`, `max`, `currency` (a single price has min == max). */
const toPrice = (input: PriceInput): ItemSummary['price'] =>
  input
    ? 'amount' in input && input.amount !== undefined
      ? { min: input.amount, max: input.amount, currency: input.currency }
      : { min: input.min ?? null, max: input.max ?? null, currency: input.currency }
    : null

function fullItem(summary: ItemSummary): Item {
  const list = devTreeState.lists.find((l) => l.id === summary.list_id)
  const folders = new Map<string, Folder>(devTreeState.folders.map((f) => [f.id, f]))
  const path: components['schemas']['PathSegment'][] = []
  for (let id = list?.folder_id ?? null; id; id = folders.get(id)?.parent_folder_id ?? null) {
    path.unshift({ type: 'folder', id, name: folders.get(id)?.name ?? '' })
  }
  if (list) path.push({ type: 'list', id: list.id, name: list.name })
  const { image, ...rest } = summary
  // An item's kind is its list's; details written for another kind were cleared by the kind change.
  const kind = list?.kind ?? summary.kind
  const saved = extras.get(summary.id)
  return {
    ...rest,
    kind,
    image: image ? { source: 'url', url: image.url } : null,
    website:
      saved?.website !== undefined
        ? saved.website
        : seed(summary.id) % 3 === 0
          ? 'https://example.com/product'
          : null,
    content_version: 1,
    metadata: saved
      ? saved.kind === kind
        ? saved.metadata
        : {}
      : metadataFor({ id: summary.id, kind }),
    path,
  } as Item
}

type FieldIssue = { field: string; message: string }
type Body = Record<string, unknown>

/** A light version of the server's rules (DATA_MODEL §2), enough to exercise the form's 422 paths. */
function validateBody(body: Body, kind: string): FieldIssue[] {
  const issues: FieldIssue[] = []
  const add = (field: string, message: string) => issues.push({ field, message })
  if ('title' in body && (typeof body.title !== 'string' || !body.title.trim())) {
    add('title', 'Title must not be blank.')
  }
  const price = body.price as
    | { amount?: string; min?: string | null; max?: string | null; currency?: string }
    | null
    | undefined
  if (price && kind === 'generic') add('price', 'A generic list has no price.')
  else if (price) {
    const hasRange = price.min !== undefined || price.max !== undefined
    if (price.amount !== undefined && hasRange) {
      add('price', 'Use either amount or min and max, not both.')
    } else if (price.amount === undefined && !price.min && !price.max) {
      add('price', 'Set an amount, a minimum or a maximum.')
    } else if (!price.currency) add('price.currency', 'Currency is required with a price.')
    if (price.min && price.max && Number(price.min) > Number(price.max)) {
      add('price.max', 'Maximum must not be lower than the minimum.')
    }
  }
  const url = body.website
  if (typeof url === 'string' && !/^https?:\/\//.test(url)) {
    add('website', 'Must be an http or https address.')
  }
  return issues
}

const unknownKey = (body: Body, allowed: string[]) =>
  Object.keys(body).find((key) => !allowed.includes(key))
const ITEM_KEYS = ['title', 'price', 'website', 'metadata']

/**
 * Dev fake of `GET`/`PATCH`/`DELETE /items/{id}`, `POST /items/{id}/move` and `GET …/content`, on top of
 * the item store of `devItems.ts` (`VITE_API_MOCKS=1` worker only). Every item has kind details
 * (except every fifth), no website except every third, and a short Markdown description.
 */
export const devItemDetailHandlers = [
  http.post(url('/api/v1/lists/:id/items'), async ({ params, request }) => {
    const listId = String(params.id)
    if (!devItemStore.has(listId)) return problemResponse(404, 'not_found')
    const body = (await request.json()) as Body
    const unknown = unknownKey(body, ITEM_KEYS)
    if (unknown) return problemResponse(400, 'unknown_field', { detail: unknown })
    const kind = devTreeState.lists.find((l) => l.id === listId)?.kind ?? 'generic'
    const issues = validateBody({ ...body, title: body.title ?? '' }, kind)
    if (issues.length > 0) return problemResponse(422, 'validation_failed', { errors: issues })
    const now = new Date().toISOString()
    const created = {
      id: crypto.randomUUID(),
      list_id: listId,
      title: String(body.title).trim(),
      kind,
      image: null,
      price: kind === 'generic' ? null : toPrice((body.price as PriceInput) ?? null),
      website: null,
      content_version: 0,
      sort_order: 0,
      version: 1,
      created_at: now,
      updated_at: now,
    } as ItemSummary
    devItemStore.append(created)
    extras.set(created.id, {
      kind,
      metadata: (body.metadata as Body | undefined) ?? {},
      website: (body.website as string | null) ?? null,
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
    const kind = current.kind
    const metadata = ('metadata' in body ? body.metadata : current.metadata) as Body
    const issues = validateBody(body, kind)
    if (issues.length > 0) return problemResponse(422, 'validation_failed', { errors: issues })
    const { website, price, metadata: _ignored, ...summaryPatch } = body
    void _ignored
    const changed = Object.keys(body).length > 0
    const next = {
      ...summary,
      ...summaryPatch,
      ...(price !== undefined && { price: toPrice(price as PriceInput) }),
      kind,
      version: changed ? summary.version + 1 : summary.version,
      updated_at: changed ? new Date().toISOString() : summary.updated_at,
    } as ItemSummary
    devItemStore.replace(next)
    extras.set(next.id, {
      kind,
      metadata,
      website: website === undefined ? current.website : (website as string | null),
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
    const destination = devTreeState.lists.find((l) => l.id === list_id)
    if (!destination) return problemResponse(409, 'destination_unavailable')
    if (destination.kind !== fullItem(summary).kind) return problemResponse(409, 'kind_mismatch')
    devItemStore.remove(summary.id)
    devItemStore.append({ ...summary, list_id, version: summary.version + 1 })
    return HttpResponse.json(fullItem({ ...summary, list_id, version: summary.version + 1 }))
  }),
]
