import { http, HttpResponse } from 'msw/http'
import { problemResponse } from '../problems'
import {
  checkMatch,
  descendantsOf,
  etag,
  folderOf,
  invalid,
  nextOrder,
  url,
  validName,
  type Folder,
  type TreeDb,
} from './helpers'

/** Folder endpoints of the fake (API.md §3). */
export function folderHandlers(db: TreeDb) {
  const { state, newId, now } = db

  return [
    http.post(url('/api/v1/folders'), async ({ request }) => {
      const body = (await request.json()) as { name?: unknown; parent_folder_id?: string | null }
      const name = validName(body.name)
      if (!name) return invalid('name', 'Name must be 1 to 200 characters.')
      const parent = body.parent_folder_id ?? null
      if (parent !== null && !folderOf(state, parent))
        return problemResponse(409, 'destination_unavailable')
      const folder: Folder = {
        id: newId(),
        parent_folder_id: parent,
        name,
        sort_order: nextOrder(state, parent, 'folder'),
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
      if (parent !== null && !folderOf(state, parent)) return problemResponse(404, 'not_found')
      const siblings = state.folders.filter((f) => f.parent_folder_id === parent)
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
    http.patch(url('/api/v1/folders/:id'), async ({ request, params }) => {
      const folder = folderOf(state, String(params.id))
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
      const folder = folderOf(state, String(params.id))
      if (!folder) return problemResponse(404, 'not_found')
      const mismatch = checkMatch(request, 'f', folder.version)
      if (mismatch) return mismatch
      const doomed = descendantsOf(state, folder.id)
      state.folders = state.folders.filter((f) => !doomed.has(f.id))
      state.lists = state.lists.filter((l) => !(l.folder_id && doomed.has(l.folder_id)))
      return new HttpResponse(null, { status: 204 })
    }),
    http.post(url('/api/v1/folders/:id/move'), async ({ request, params }) => {
      const folder = folderOf(state, String(params.id))
      if (!folder) return problemResponse(404, 'not_found')
      const mismatch = checkMatch(request, 'f', folder.version)
      if (mismatch) return mismatch
      const body = (await request.json()) as { parent_folder_id?: string | null }
      if (body.parent_folder_id === undefined) return invalid('parent_folder_id', 'Required.')
      const target = body.parent_folder_id
      if (target !== null && !folderOf(state, target))
        return problemResponse(409, 'destination_unavailable')
      if (target !== null && descendantsOf(state, folder.id).has(target)) {
        return problemResponse(409, 'cycle_detected')
      }
      folder.parent_folder_id = target
      folder.sort_order = nextOrder(state, target, 'folder')
      folder.version += 1
      folder.updated_at = now()
      return HttpResponse.json(folder, { headers: etag('f', folder.version) })
    }),
  ]
}
