import { http, HttpResponse } from 'msw/http'
import type { components } from '../generated/schema'
import { devTree } from './devData'
import { problemResponse } from './problems'

type Tree = components['schemas']['Tree']
type List = components['schemas']['List']
type ItemSummary = components['schemas']['ItemSummary']
type ItemKind = ItemSummary['kind']
type SortMode = components['schemas']['SortMode']
type DisplayMode = components['schemas']['DisplayMode']

const url = (path: string) => `${globalThis.location?.origin ?? ''}${path}`
const stamp = '2026-10-14T09:00:00Z'

// A real image that works offline (data URI), so the grid shows covers without network.
const cover = (hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 55% 55%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 60% 35%)"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/></svg>`,
  )}`
// `.invalid` never resolves, so these exercise the fallback tile after a failed load.
const BROKEN = 'https://images.example.invalid/missing.jpg'

const TITLES: Record<ItemKind, string[]> = {
  movie: ['Blade Runner 2049', 'Arrival', 'The Grand Budapest Hotel', 'Past Lives', 'Drive'],
  tv_show: ['Severance', 'The Bear', 'Slow Horses', 'Andor', 'Shōgun'],
  motorcycle: ['Ducati Monster', 'Triumph Speed 400', 'Yamaha MT-07', 'Honda CB650R'],
  car: ['Mazda MX-5 Miata', 'Volvo V60 Cross Country', 'Alpine A110'],
  camera: ['Fujifilm X100VI', 'Ricoh GR III', 'Leica Q3', 'Sony A7C II'],
  generic: ['Standing desk', 'Noise-cancelling headphones', 'Espresso machine', 'Trail shoes'],
}
const KINDS = Object.keys(TITLES) as ItemKind[]
const STATUSES = ['Watched', 'Planned', 'Owned', 'Wishlist', null, 'Saving up']
const SUMMARIES = [
  null,
  'A long and slightly rambling summary, so the two-line clamp in thumbnail rows has something to cut off. It keeps going to make sure it really wraps over several lines on narrow screens.',
  'Short note.',
]

function makeItems(list: List, count: number): ItemSummary[] {
  return Array.from({ length: count }, (_, i) => {
    const kind = KINDS[(i + Number(list.id.slice(-2))) % KINDS.length] as ItemKind
    const pool = TITLES[kind]
    const title = `${pool[i % pool.length]}${i >= pool.length ? ` (${Math.floor(i / pool.length) + 1})` : ''}`
    const image =
      i % 7 === 3
        ? { url: BROKEN, thumbnail_url: BROKEN }
        : i % 3 === 0
          ? { url: cover((i * 47) % 360), thumbnail_url: cover((i * 47) % 360) }
          : null
    const priced = i % 4
    return {
      id: `7c1e5a10-0000-4000-a000-${list.id.slice(-4).padStart(4, '0')}${String(i).padStart(8, '0')}`,
      list_id: list.id,
      title,
      kind,
      summary: SUMMARIES[i % SUMMARIES.length] ?? null,
      status: STATUSES[i % STATUSES.length] ?? null,
      image,
      price:
        priced === 0
          ? null
          : priced === 1
            ? { min: String(500 + i * 25), max: String(500 + i * 25), currency: 'EUR' }
            : priced === 2
              ? { min: '1200.00', max: '1500.50', currency: 'EUR' }
              : { min: '49.90', max: null, currency: 'EUR' },
      official_website_url: null,
      content_version: 0,
      sort_order: i,
      version: 1,
      created_at: stamp,
      updated_at: new Date(
        Date.UTC(2026, 9, 14, 9, 0, 0) - ((i * 7919) % 5000) * 60_000,
      ).toISOString(),
    } satisfies ItemSummary
  })
}

/**
 * Stateful in-memory fake of the list-view endpoints (`VITE_API_MOCKS=1` dev worker only): `GET`
 * and `PATCH` of a list's display and sort mode, `GET` of its items (sort, `q`, paging) and
 * `PUT …/items/order` (with `order_stale`). A few items per list, covering every kind, with and
 * without images and with one image that fails to load. Folder and list CRUD stays in `devData`.
 */
export function createItemsBackend(tree: Tree) {
  const items = new Map<string, ItemSummary[]>()
  for (const list of tree.lists) items.set(list.id, makeItems(list, Math.min(list.item_count, 48)))
  // Display/sort changes and the version bumps they cause; everything else comes from the tree.
  const overlay = new Map<
    string,
    { display_mode?: DisplayMode; sort_mode?: SortMode; bumps: number }
  >()

  /** The tree as the dev worker serves it now (so renames elsewhere show), else the initial one. */
  async function currentTree(): Promise<Tree> {
    try {
      const response = await fetch(url('/api/v1/tree'))
      if (response.ok) return (await response.json()) as Tree
    } catch {
      // fall back to the initial tree
    }
    return tree
  }

  async function detail(id: string): Promise<List | undefined> {
    const now = await currentTree()
    const list = now.lists.find((l) => l.id === id)
    if (!list) return undefined
    const extra = overlay.get(id)
    const path: NonNullable<List['path']> = []
    for (
      let parent = list.folder_id ? now.folders.find((f) => f.id === list.folder_id) : undefined;
      parent;
      parent = parent.parent_folder_id
        ? now.folders.find((f) => f.id === parent!.parent_folder_id)
        : undefined
    ) {
      path.unshift({ type: 'folder', id: parent.id, name: parent.name })
    }
    return {
      ...list,
      ...extra,
      item_count: items.get(id)?.length ?? list.item_count,
      version: list.version + (extra?.bumps ?? 0),
      path,
    }
  }

  const bySort = (sort: SortMode) => (a: ItemSummary, b: ItemSummary) =>
    sort === 'title'
      ? a.title.localeCompare(b.title)
      : sort === 'updated'
        ? b.updated_at.localeCompare(a.updated_at)
        : a.sort_order - b.sort_order

  const handlers = [
    http.get(url('/api/v1/lists/:id'), async ({ params }) => {
      const list = await detail(String(params.id))
      if (!list) return problemResponse(404, 'not_found')
      return HttpResponse.json(list, { headers: { ETag: `"l-${list.version}"` } })
    }),

    http.patch(url('/api/v1/lists/:id'), async ({ request, params }) => {
      const body = (await request.clone().json()) as Record<string, unknown>
      const keys = Object.keys(body)
      // Renames and the like belong to the tree backend: fall through to the next handler.
      if (keys.length === 0 || keys.some((k) => k !== 'display_mode' && k !== 'sort_mode')) return
      const id = String(params.id)
      const list = await detail(id)
      if (!list) return problemResponse(404, 'not_found')
      const header = request.headers.get('If-Match')
      if (!header) return problemResponse(428, 'precondition_required')
      if (header !== `"l-${list.version}"`) {
        return problemResponse(412, 'version_conflict', { current_version: list.version })
      }
      const current = overlay.get(id) ?? { bumps: 0 }
      overlay.set(id, { ...current, ...body, bumps: current.bumps + 1 })
      const updated = (await detail(id)) as List
      return HttpResponse.json(updated, { headers: { ETag: `"l-${updated.version}"` } })
    }),

    http.get(url('/api/v1/lists/:id/items'), async ({ request, params }) => {
      const id = String(params.id)
      const all = items.get(id)
      const list = await detail(id)
      if (!all || !list) return problemResponse(404, 'not_found')
      const query = new URL(request.url).searchParams
      const sort = (query.get('sort') as SortMode | null) ?? list.sort_mode
      const q = (query.get('q') ?? '').toLowerCase()
      const limit = Math.min(Number(query.get('limit') ?? 50), 200)
      const offset = Number(query.get('offset') ?? 0)
      const matching = all.filter((item) => item.title.toLowerCase().includes(q)).sort(bySort(sort))
      return HttpResponse.json({
        data: matching.slice(offset, offset + limit),
        page: { limit, offset, total: matching.length },
      })
    }),

    http.put(url('/api/v1/lists/:id/items/order'), async ({ request, params }) => {
      const all = items.get(String(params.id))
      if (!all) return problemResponse(404, 'not_found')
      const { ids } = (await request.json()) as { ids: string[] }
      const same =
        ids.length === all.length &&
        new Set(ids).size === ids.length &&
        all.every((i) => ids.includes(i.id))
      if (!same) return problemResponse(409, 'order_stale')
      const byId = new Map(all.map((item) => [item.id, item]))
      items.set(
        String(params.id),
        ids.map((id, index) => ({ ...(byId.get(id) as ItemSummary), sort_order: index })),
      )
      return new HttpResponse(null, { status: 204 })
    }),
  ]

  return { handlers }
}

export const devItemHandlers = createItemsBackend(devTree).handlers
