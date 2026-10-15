import { http, HttpResponse } from 'msw/http'
import type { components } from '../generated/schema'
import { problemResponse } from './problems'

type Folder = components['schemas']['Folder']
type List = components['schemas']['List']
type Tree = components['schemas']['Tree']
type DisplayMode = components['schemas']['DisplayMode']
type SortMode = components['schemas']['SortMode']
type ItemKind = components['schemas']['ItemKind']

const DISPLAY_MODES: DisplayMode[] = ['compact', 'thumbnail', 'grid']
const ITEM_KINDS: ItemKind[] = ['generic', 'movie', 'tv_show', 'motorcycle', 'car', 'camera']
const SORT_MODES: SortMode[] = ['manual', 'title', 'updated', 'price', 'kind_key']

const url = (path: string) => `${globalThis.location?.origin ?? ''}${path}`

/**
 * A small in-memory fake of the folders and lists endpoints (API.md §3, §4, D-054, D-060): it
 * keeps state, bumps versions, checks `If-Match`, rejects cycles and stale orders, and answers
 * with the same problem shapes as the real backend. Used by `VITE_API_MOCKS=1` dev (through
 * `devData.ts`) and by tests that need a tree that really changes.
 */
export function createTreeBackend(initial: Tree) {
  const state = {
    folders: structuredClone(initial.folders) as Folder[],
    lists: structuredClone(initial.lists) as List[],
  }
  let counter = 0
  const newId = () => `7c1e5a10-0000-4000-9000-${String(++counter).padStart(12, '0')}`
  const now = () => new Date().toISOString()

  const nextOrder = (parent: string | null, kind: 'folder' | 'list') => {
    const siblings =
      kind === 'folder'
        ? state.folders.filter((f) => f.parent_folder_id === parent)
        : state.lists.filter((l) => l.folder_id === parent)
    return siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.sort_order)) + 1
  }

  const folderOf = (id: string | null) =>
    id === null ? undefined : state.folders.find((f) => f.id === id)

  /** Missing or malformed `If-Match` is 428; a stale version is 412. Returns a response on failure. */
  const checkMatch = (request: Request, prefix: 'f' | 'l', version: number) => {
    const header = request.headers.get('If-Match')
    if (!header || !/^"[fl]-\d+"$/.test(header))
      return problemResponse(428, 'precondition_required')
    if (header !== `"${prefix}-${version}"`) {
      return problemResponse(412, 'version_conflict', { current_version: version })
    }
    return null
  }
  const etag = (prefix: string, version: number) => ({ ETag: `"${prefix}-${version}"` })

  const validName = (name: unknown) => {
    const trimmed = typeof name === 'string' ? name.trim() : ''
    return trimmed.length >= 1 && trimmed.length <= 200 ? trimmed : null
  }
  const invalid = (field: string, message: string) =>
    problemResponse(422, 'validation_failed', { errors: [{ field, message }] })

  const descendantsOf = (id: string): Set<string> => {
    const found = new Set<string>([id])
    let grew = true
    while (grew) {
      grew = false
      for (const f of state.folders) {
        if (f.parent_folder_id && found.has(f.parent_folder_id) && !found.has(f.id)) {
          found.add(f.id)
          grew = true
        }
      }
    }
    return found
  }

  const handlers = [
    http.get(url('/api/v1/tree'), () =>
      HttpResponse.json({ folders: state.folders, lists: state.lists } satisfies Tree),
    ),

    // ---- folders ----
    http.post(url('/api/v1/folders'), async ({ request }) => {
      const body = (await request.json()) as { name?: unknown; parent_folder_id?: string | null }
      const name = validName(body.name)
      if (!name) return invalid('name', 'Name must be 1 to 200 characters.')
      const parent = body.parent_folder_id ?? null
      if (parent !== null && !folderOf(parent))
        return problemResponse(409, 'destination_unavailable')
      const folder: Folder = {
        id: newId(),
        parent_folder_id: parent,
        name,
        sort_order: nextOrder(parent, 'folder'),
        version: 1,
        created_at: now(),
        updated_at: now(),
      }
      state.folders.push(folder)
      return HttpResponse.json(folder, { status: 201, headers: etag('f', 1) })
    }),
    http.put(url('/api/v1/folders/order'), async ({ request }) => {
      const body = (await request.json()) as { parent_folder_id?: string | null; ids?: string[] }
      if (body.parent_folder_id === undefined || !body.ids)
        return invalid('parent_folder_id', 'Required.')
      const parent = body.parent_folder_id
      if (parent !== null && !folderOf(parent)) return problemResponse(404, 'not_found')
      const siblings = state.folders.filter((f) => f.parent_folder_id === parent)
      if (
        body.ids.length !== siblings.length ||
        new Set(body.ids).size !== body.ids.length ||
        !body.ids.every((id) => siblings.some((s) => s.id === id))
      ) {
        return problemResponse(409, 'order_stale')
      }
      body.ids.forEach((id, i) => (siblings.find((s) => s.id === id)!.sort_order = i))
      return new HttpResponse(null, { status: 204 })
    }),
    http.patch(url('/api/v1/folders/:id'), async ({ request, params }) => {
      const folder = folderOf(String(params.id))
      if (!folder) return problemResponse(404, 'not_found')
      const mismatch = checkMatch(request, 'f', folder.version)
      if (mismatch) return mismatch
      const body = (await request.json()) as { name?: unknown }
      if (body.name !== undefined) {
        const name = validName(body.name)
        if (!name) return invalid('name', 'Name must be 1 to 200 characters.')
        folder.name = name
        folder.version += 1
        folder.updated_at = now()
      }
      return HttpResponse.json(folder, { headers: etag('f', folder.version) })
    }),
    http.delete(url('/api/v1/folders/:id'), ({ request, params }) => {
      const folder = folderOf(String(params.id))
      if (!folder) return problemResponse(404, 'not_found')
      const mismatch = checkMatch(request, 'f', folder.version)
      if (mismatch) return mismatch
      const doomed = descendantsOf(folder.id)
      state.folders = state.folders.filter((f) => !doomed.has(f.id))
      state.lists = state.lists.filter((l) => !(l.folder_id && doomed.has(l.folder_id)))
      return new HttpResponse(null, { status: 204 })
    }),
    http.post(url('/api/v1/folders/:id/move'), async ({ request, params }) => {
      const folder = folderOf(String(params.id))
      if (!folder) return problemResponse(404, 'not_found')
      const mismatch = checkMatch(request, 'f', folder.version)
      if (mismatch) return mismatch
      const body = (await request.json()) as { parent_folder_id?: string | null }
      if (body.parent_folder_id === undefined) return invalid('parent_folder_id', 'Required.')
      const target = body.parent_folder_id
      if (target !== null && !folderOf(target))
        return problemResponse(409, 'destination_unavailable')
      if (target !== null && descendantsOf(folder.id).has(target)) {
        return problemResponse(409, 'cycle_detected')
      }
      folder.parent_folder_id = target
      folder.sort_order = nextOrder(target, 'folder')
      folder.version += 1
      folder.updated_at = now()
      return HttpResponse.json(folder, { headers: etag('f', folder.version) })
    }),

    // ---- lists ----
    http.post(url('/api/v1/lists'), async ({ request }) => {
      const body = (await request.json()) as {
        name?: unknown
        kind?: unknown
        folder_id?: string | null
      }
      const name = validName(body.name)
      if (!name) return invalid('name', 'Name must be 1 to 200 characters.')
      if (!ITEM_KINDS.includes(body.kind as ItemKind)) return invalid('kind', 'Choose a kind.')
      const parent = body.folder_id ?? null
      if (parent !== null && !folderOf(parent))
        return problemResponse(409, 'destination_unavailable')
      const list: List = {
        id: newId(),
        folder_id: parent,
        name,
        kind: body.kind as ItemKind,
        description: null,
        display_mode: 'grid',
        sort_mode: 'manual',
        pinned_fields: null,
        sort_order: nextOrder(parent, 'list'),
        item_count: 0,
        version: 1,
        created_at: now(),
        updated_at: now(),
      }
      state.lists.push(list)
      return HttpResponse.json(list, { status: 201, headers: etag('l', 1) })
    }),
    http.put(url('/api/v1/lists/order'), async ({ request }) => {
      const body = (await request.json()) as { folder_id?: string | null; ids?: string[] }
      if (body.folder_id === undefined || !body.ids) return invalid('folder_id', 'Required.')
      const parent = body.folder_id
      if (parent !== null && !folderOf(parent)) return problemResponse(404, 'not_found')
      const siblings = state.lists.filter((l) => l.folder_id === parent)
      if (
        body.ids.length !== siblings.length ||
        new Set(body.ids).size !== body.ids.length ||
        !body.ids.every((id) => siblings.some((s) => s.id === id))
      ) {
        return problemResponse(409, 'order_stale')
      }
      body.ids.forEach((id, i) => (siblings.find((s) => s.id === id)!.sort_order = i))
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(url('/api/v1/lists/:id'), ({ params }) => {
      const list = state.lists.find((l) => l.id === params.id)
      if (!list) return problemResponse(404, 'not_found')
      const path: NonNullable<List['path']> = []
      for (
        let parent = folderOf(list.folder_id);
        parent;
        parent = folderOf(parent.parent_folder_id)
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
        kind?: unknown
        description?: string | null
        display_mode?: unknown
        sort_mode?: unknown
        pinned_fields?: List['pinned_fields']
      }
      let changed = false
      // `kind_key` has no key on a generic list, so the resulting pair must not be (kind_key, generic).
      const nextKind = ITEM_KINDS.includes(body.kind as ItemKind)
        ? (body.kind as ItemKind)
        : list.kind
      const nextSort = (body.sort_mode as SortMode | undefined) ?? list.sort_mode
      if (nextSort === 'kind_key' && nextKind === 'generic') {
        return invalid('sort_mode', 'Sorting by the kind key is not available on a generic list.')
      }
      if (nextSort === 'price' && nextKind === 'generic') {
        return invalid('sort_mode', 'Sorting by price is not available on a generic list.')
      }
      if (body.display_mode !== undefined) {
        if (!DISPLAY_MODES.includes(body.display_mode as DisplayMode)) {
          return invalid('display_mode', 'Unknown display mode.')
        }
        list.display_mode = body.display_mode as DisplayMode
        changed = true
      }
      if (body.sort_mode !== undefined) {
        if (!SORT_MODES.includes(body.sort_mode as SortMode)) {
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
      if (body.kind !== undefined) {
        if (!ITEM_KINDS.includes(body.kind as ItemKind)) return invalid('kind', 'Unknown kind.')
        if (body.kind !== list.kind) {
          list.kind = body.kind as ItemKind
          list.pinned_fields = null
          changed = true
        }
      }
      if (body.pinned_fields !== undefined) {
        const pins = body.pinned_fields
        list.pinned_fields =
          pins === null ? null : { under: pins.under ?? [], right: pins.right ?? [] }
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
      if (target !== null && !folderOf(target))
        return problemResponse(409, 'destination_unavailable')
      list.folder_id = target
      list.sort_order = nextOrder(target, 'list')
      list.version += 1
      list.updated_at = now()
      return HttpResponse.json(list, { headers: etag('l', list.version) })
    }),
  ]

  return { handlers, state }
}
