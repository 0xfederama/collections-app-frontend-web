import { http, HttpResponse } from 'msw/http'
import { problemResponse } from '../problems'
import { OWNER_USER_ID, ownerFor } from '../users'
import { mockTypes } from '../types'
import {
  checkMatch,
  etag,
  folderOf,
  invalid,
  nextOrder,
  url,
  validName,
  type List,
  type PathSegment,
  type TreeDb,
} from './helpers'

// The contract sends these as plain strings now; the fake takes them from the list record.
type DisplayMode = List['display_mode']
type SortMode = List['sort_mode']
type ItemType = List['type']

const DISPLAY_MODES: DisplayMode[] = ['compact', 'thumbnail', 'grid']
const ITEM_TYPES: ItemType[] = mockTypes.map((type) => type.key)
const PRICE_TYPES = new Set<ItemType>(
  mockTypes.filter((type) => type.allows_price).map((type) => type.key),
)
const supportsSort = (type: ItemType, sort: SortMode) =>
  ['manual', 'title', 'updated'].includes(sort) ||
  (sort === 'price' && PRICE_TYPES.has(type)) ||
  mockTypes.some(
    (definition) =>
      definition.key === type && definition.fields.some((field) => field.key === sort),
  )

/** List endpoints of the fake (API.md §4, D-054, D-060). */
export function listHandlers(db: TreeDb) {
  const { state, newId, now } = db

  return [
    http.post(url('/api/v1/lists'), async ({ request }) => {
      const body = (await request.json()) as {
        name?: unknown
        type?: unknown
        folder_id?: string | null
        icon?: string | null
        icon_color?: List['icon_color']
      }
      const name = validName(body.name)
      if (!name) return invalid('name', 'Name must be 1 to 200 characters.')
      if (
        body.type !== undefined &&
        !ITEM_TYPES.includes(body.type as ItemType) &&
        body.type !== null
      )
        return invalid('type', 'Unknown type.')
      const parent = body.folder_id ?? null
      if (parent !== null && !folderOf(state, parent))
        return problemResponse(409, 'destination_unavailable')
      const list: List = {
        id: newId(),
        folder_id: parent,
        name,
        type: (body.type ?? null) as ItemType,
        description: null,
        display_mode: 'grid',
        sort_mode: 'manual',
        icon: body.icon ?? null,
        icon_color: body.icon_color ?? null,
        sort_order: nextOrder(state, parent, 'list'),
        item_count: 0,
        version: 1,
        created_at: now(),
        updated_at: now(),
        owner_user_id: ownerFor(parent),
        created_by_user_id: OWNER_USER_ID,
        updated_by_user_id: OWNER_USER_ID,
      }
      state.lists.push(list)
      return HttpResponse.json(list, { status: 201, headers: etag('l', 1) })
    }),
    http.put(url('/api/v1/lists/order'), async ({ request }) => {
      const body = (await request.json()) as { folder_id?: string | null; ids?: string[] }
      if (body.folder_id === undefined || !body.ids) return invalid('folder_id', 'Required.')
      const parent = body.folder_id
      if (parent !== null && !folderOf(state, parent)) return problemResponse(404, 'not_found')
      const siblings = state.lists.filter((l) => l.folder_id === parent)
      if (
        body.ids.length !== siblings.length ||
        new Set(body.ids).size !== body.ids.length ||
        !body.ids.every((id) => siblings.some((s) => s.id === id))
      ) {
        return problemResponse(409, 'order_stale')
      }
      body.ids.forEach((id, i) => {
        const sibling = siblings.find((s) => s.id === id)
        if (sibling) sibling.sort_order = i
      })
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(url('/api/v1/lists/:id'), ({ params }) => {
      const list = state.lists.find((l) => l.id === params.id)
      if (!list) return problemResponse(404, 'not_found')
      const path: PathSegment[] = []
      for (
        let parent = folderOf(state, list.folder_id);
        parent;
        parent = folderOf(state, parent.parent_folder_id)
      ) {
        path.unshift({ type: 'folder', id: parent.id, name: parent.name })
      }
      return HttpResponse.json({ ...list, path }, { headers: etag('l', list.version) })
    }),
    http.patch(url('/api/v1/lists/:id'), async ({ request, params }) => {
      const list = state.lists.find((l) => l.id === params.id)
      if (!list) return problemResponse(404, 'not_found')
      const mismatch = checkMatch(request, 'l', list.version)
      if (mismatch) return mismatch
      const body = (await request.json()) as {
        name?: unknown
        type?: unknown
        description?: string | null
        display_mode?: unknown
        sort_mode?: unknown
        icon?: List['icon']
        icon_color?: List['icon_color']
      }
      let changed = false
      const nextType = body.type === undefined ? list.type : (body.type as ItemType)
      const nextSort = (body.sort_mode as SortMode | undefined) ?? list.sort_mode
      if (!supportsSort(nextType, nextSort))
        return invalid('sort_mode', 'Sorting by this field is not available on this type.')
      if (body.display_mode !== undefined) {
        if (!DISPLAY_MODES.includes(body.display_mode as DisplayMode)) {
          return invalid('display_mode', 'Unknown display mode.')
        }
        list.display_mode = body.display_mode as DisplayMode
        changed = true
      }
      if (body.sort_mode !== undefined) {
        if (!supportsSort(nextType, body.sort_mode as SortMode)) {
          return invalid('sort_mode', 'Unknown sort mode.')
        }
        list.sort_mode = body.sort_mode as SortMode
        changed = true
      }
      if (body.name !== undefined) {
        const name = validName(body.name)
        if (!name) return invalid('name', 'Name must be 1 to 200 characters.')
        list.name = name
        changed = true
      }
      if (body.type !== undefined) {
        if (body.type !== null && !ITEM_TYPES.includes(body.type as ItemType))
          return invalid('type', 'Unknown type.')
        if (body.type !== list.type) {
          list.type = body.type as ItemType
          changed = true
        }
      }
      if (body.icon !== undefined) {
        list.icon = body.icon
        if (body.icon === null || !body.icon.startsWith('i:')) list.icon_color = null
        changed = true
      }
      if (body.icon_color !== undefined) {
        list.icon_color = body.icon_color
        changed = true
      }
      if (body.description !== undefined) {
        if (
          body.description !== null &&
          new TextEncoder().encode(body.description).length > 64 * 1024
        ) {
          return invalid('description', 'Description must be at most 64 KiB.')
        }
        list.description = body.description
        changed = true
      }
      if (changed) {
        list.version += 1
        list.updated_at = now()
      }
      return HttpResponse.json(list, { headers: etag('l', list.version) })
    }),
    http.delete(url('/api/v1/lists/:id'), ({ request, params }) => {
      const list = state.lists.find((l) => l.id === params.id)
      if (!list) return problemResponse(404, 'not_found')
      const mismatch = checkMatch(request, 'l', list.version)
      if (mismatch) return mismatch
      state.lists = state.lists.filter((l) => l.id !== list.id)
      return new HttpResponse(null, { status: 204 })
    }),
    http.post(url('/api/v1/lists/:id/move'), async ({ request, params }) => {
      const list = state.lists.find((l) => l.id === params.id)
      if (!list) return problemResponse(404, 'not_found')
      const mismatch = checkMatch(request, 'l', list.version)
      if (mismatch) return mismatch
      const body = (await request.json()) as { folder_id?: string | null }
      if (body.folder_id === undefined) return invalid('folder_id', 'Required.')
      const target = body.folder_id
      if (target !== null && !folderOf(state, target))
        return problemResponse(409, 'destination_unavailable')
      list.folder_id = target
      list.owner_user_id = ownerFor(target)
      list.sort_order = nextOrder(state, target, 'list')
      list.version += 1
      list.updated_at = now()
      return HttpResponse.json(list, { headers: etag('l', list.version) })
    }),
  ]
}
