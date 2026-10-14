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
    official_website_url: seed(summary.id) % 3 === 0 ? 'https://example.com/product' : null,
    content_version: 1,
    metadata: metadataFor(summary),
    path,
  } as Item
}

/**
 * Dev fake of `GET`/`DELETE /items/{id}`, `POST /items/{id}/move` and `GET …/content`, on top of
 * the item store of `devItems.ts` (`VITE_API_MOCKS=1` worker only). Every item has kind details
 * (except every fifth), no official site except every third, and a short Markdown description.
 */
export const devItemDetailHandlers = [
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
