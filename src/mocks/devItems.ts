import { http, HttpResponse } from 'msw/http'
import type { components } from '../generated/schema'
import { devTreeState, devWorkerTree } from './devData'
import { problemResponse } from './problems'
import { mockTypes } from './types'

type Tree = components['schemas']['Tree']
type List = components['schemas']['List']
type ItemSummary = components['schemas']['ItemSummary']
type ItemType = ItemSummary['type']
const PRICE_TYPES = new Set<string | null>(
  mockTypes.filter((type) => type.allows_price).map((type) => type.key),
)
type SortMode = List['sort_mode']

const url = (path: string) => `${globalThis.location?.origin ?? ''}${path}`
const stamp = '2026-10-14T09:00:00Z'

// A real image that works offline (data URI), so the grid shows covers without network.
const cover = (hue: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 55% 55%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 60% 35%)"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/></svg>`,
  )}`
// `.invalid` never resolves, so these exercise the fallback tile after a failed load.
const BROKEN = 'https://images.example.invalid/missing.jpg'

/** Every streaming service the registry knows, so the dev lists show each icon in place. */
const STREAMING = [
  'Netflix',
  'Prime Video',
  'Disney+',
  'Apple TV+',
  'YouTube',
  'TIMvision',
  'Infinity',
  'Paramount+',
  'HBO Max',
  'NOW',
  'Sky',
  'RaiPlay',
  'Rakuten TV',
  'Hulu',
  'Discovery+',
  'MUBI',
  'Google Play',
  'Peacock',
  'Crunchyroll',
]
const STORES = ['amazon', 'bookshop', 'apple_books', 'google_play_books', 'kobo']
const pick = <T>(pool: readonly T[], i: number, n: number) =>
  Array.from({ length: n }, (_, k) => pool[(i * 3 + k) % pool.length] as T)

const BOOK_AUTHORS = [
  'Frank Herbert',
  'Ursula K. Le Guin',
  'Susanna Clarke',
  'Octavia E. Butler',
  'Stanisław Lem',
]

const TITLES: Record<string, string[]> = {
  movie: ['Blade Runner 2049', 'Arrival', 'The Grand Budapest Hotel', 'Past Lives', 'Drive'],
  tv_show: ['Severance', 'The Bear', 'Slow Horses', 'Andor', 'Shōgun'],
  book: ['Dune', 'The Left Hand of Darkness', 'Piranesi', 'Kindred', 'Solaris'],
  vehicle: [
    'Ducati Monster',
    'Triumph Speed 400',
    'Mazda MX-5 Miata',
    'Volvo V60 Cross Country',
    'Alpine A110',
  ],
  wishlist: ['Fujifilm X100VI', 'Ricoh GR III', 'Leica Q3', 'Sony A7C II'],
  none: ['Standing desk', 'Noise-cancelling headphones', 'Espresso machine', 'Trail shoes'],
}
/** Type fields for the pinned layout. The contract's summaries carry none yet, so the dev fake adds them. */
function fakeMetadata(type: ItemType, i: number): Record<string, unknown> {
  switch (type) {
    case 'movie':
      return {
        runtime_minutes: 90 + ((i * 13) % 80),
        streaming: {
          country: 'IT',
          platforms: pick(STREAMING, i, 5),
          paid_platforms: i % 3 ? [] : pick(STREAMING, i, 1),
        },
      }
    case 'tv_show':
      return {
        seasons: 1 + (i % 6),
        episodes_per_season: 6 + (i % 5),
        episode_minutes: 30 + ((i * 5) % 30),
        streaming: { country: 'IT', platforms: pick(STREAMING, i + 2, 4), paid_platforms: [] },
      }
    case 'book':
      return {
        author: BOOK_AUTHORS[i % BOOK_AUTHORS.length],
        pages: 200 + i * 37,
        stores: pick(STORES, i, 4),
      }
    case 'vehicle':
      return { model_year: 2015 + (i % 10), power_hp: 70 + i * 10 }
    default:
      return {}
  }
}

function makeItems(list: List, count: number): ItemSummary[] {
  return Array.from({ length: count }, (_, i) => {
    const type = list.type
    const pool = (type === null ? TITLES.none : TITLES[type]) ?? TITLES.none ?? []
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
      type,
      image,
      price:
        priced === 0 || !PRICE_TYPES.has(type)
          ? null
          : priced === 1
            ? { min: String(500 + i * 25), max: String(500 + i * 25), currency: 'EUR' }
            : priced === 2
              ? { min: '1200.00', max: '1500.50', currency: 'EUR' }
              : { min: '49.90', max: null, currency: 'EUR' },
      website: null,
      content_version: 0,
      sort_order: i,
      version: 1,
      created_at: stamp,
      updated_at: new Date(
        Date.UTC(2026, 9, 14, 9, 0, 0) - ((i * 7919) % 5000) * 60_000,
      ).toISOString(),
      metadata: fakeMetadata(type, i),
    } as ItemSummary
  })
}

/**
 * Stateful in-memory fake of the item endpoints of a list (`VITE_API_MOCKS=1` dev worker only):
 * `GET …/items` (sort, `q`, paging) and `PUT …/items/order` (with `order_stale`). A few items per
 * list, covering every type, with and without images and with one image that fails to load.
 * The list record itself (`GET`/`PATCH /lists/:id`, display and sort mode) belongs to the tree
 * backend (`devTree.ts`), so a rename and a display-mode change use the same version.
 */
function createItemsBackend(tree: Tree, findList: (id: string) => List | undefined) {
  const items = new Map<string, ItemSummary[]>()
  for (const list of tree.lists) items.set(list.id, makeItems(list, Math.min(list.item_count, 48)))

  /** Items of a list; a list created in dev after startup starts empty. */
  const itemsOf = (id: string) => {
    if (!items.has(id) && findList(id)) items.set(id, [])
    return items.get(id)
  }

  const bySort = (sort: SortMode) => (a: ItemSummary, b: ItemSummary) => {
    if (sort === 'title') return a.title.localeCompare(b.title)
    if (sort === 'updated') return b.updated_at.localeCompare(a.updated_at)
    if (sort === 'price') {
      const pa = a.price ? Number(a.price.min) : null
      const pb = b.price ? Number(b.price.min) : null
      if (pa === null || pb === null) {
        if (pa !== pb) return pa === null ? 1 : -1
      } else if (pa !== pb) return pa - pb
      return a.title.localeCompare(b.title) || a.id.localeCompare(b.id)
    }
    if (!['manual', 'title', 'updated'].includes(sort)) {
      const left = a.metadata[sort]
      const right = b.metadata[sort]
      if (left === undefined || right === undefined) {
        if (left !== right) return left === undefined ? 1 : -1
      } else if (typeof left === 'number' && typeof right === 'number' && left !== right) {
        return left - right
      } else if (typeof left === 'boolean' && typeof right === 'boolean' && left !== right) {
        return left ? 1 : -1
      } else if (String(left) !== String(right)) {
        return String(left).localeCompare(String(right), undefined, { sensitivity: 'base' })
      }
      return a.id.localeCompare(b.id)
    }
    return a.sort_order - b.sort_order
  }

  const handlers = [
    http.get(url('/api/v1/lists/:id/items'), ({ request, params }) => {
      const id = String(params.id)
      const all = itemsOf(id)
      const list = findList(id)
      if (!all || !list) return problemResponse(404, 'not_found')
      const query = new URL(request.url).searchParams
      const sort = (query.get('sort') as SortMode | null) ?? list.sort_mode
      const definition = mockTypes.find((type) => type.key === list.type)
      const validField = definition?.fields.some((field) => field.key === sort)
      if (
        !['manual', 'title', 'updated'].includes(sort) &&
        !(sort === 'price' && PRICE_TYPES.has(list.type)) &&
        !validField
      ) {
        return problemResponse(400, 'invalid_parameter')
      }
      const q = (query.get('q') ?? '').toLowerCase()
      const limit = Math.min(Number(query.get('limit') ?? 50), 200)
      const offset = Number(query.get('offset') ?? 0)
      // The type of an item is its list's (a type change in the tree fake shows up here).
      const matching = all
        .filter((item) => item.title.toLowerCase().includes(q))
        .map((item) => ({ ...item, type: list.type }))
        .sort(bySort(sort))
      return HttpResponse.json({
        data: matching.slice(offset, offset + limit),
        page: { limit, offset, total: matching.length },
      })
    }),

    http.put(url('/api/v1/lists/:id/items/order'), async ({ request, params }) => {
      const all = itemsOf(String(params.id))
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

  /** Direct access to the stored items for the detail fake (`devItemDetail.ts`) and the search fake (`devSearch.ts`). */
  const store = {
    /** Every item of every list (the search fake in `devSearch.ts`). */
    all: () => [...items.values()].flat(),
    find: (id: string) => [...items.values()].flat().find((item) => item.id === id),
    remove: (id: string) => {
      for (const [listId, list] of items) {
        items.set(
          listId,
          list.filter((item) => item.id !== id),
        )
      }
    },
    append: (item: ItemSummary) => {
      const target = itemsOf(item.list_id)
      target?.push({ ...item, sort_order: target.length })
    },
    /** Replaces an item in place (PATCH), keeping its position in the list. */
    replace: (item: ItemSummary) => {
      const target = itemsOf(item.list_id)
      const index = target?.findIndex((candidate) => candidate.id === item.id) ?? -1
      if (target && index >= 0) target[index] = item
    },
    /** Items of a list the dev worker does not know yet start empty, so `itemsOf` creates them. */
    has: (listId: string) => findList(listId) !== undefined,
  }

  return { handlers, store }
}

const devItems = createItemsBackend(devWorkerTree, (id) =>
  devTreeState.lists.find((list) => list.id === id),
)

export const devItemStore = devItems.store

export const devItemHandlers = devItems.handlers
