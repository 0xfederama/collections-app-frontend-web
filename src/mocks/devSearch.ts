import { http, HttpResponse } from 'msw/http'
import type { components } from '../generated/schema'
import { devTreeState } from './devData'
import { devItemStore } from './devItems'
import { problemResponse } from './problems'

type PathSegment = components['schemas']['PathSegment']

const url = (path: string) => `${globalThis.location?.origin ?? ''}${path}`

/** Folders from the root down to the list, then the list: what the real backend returns as `path`. */
function pathOf(listId: string): PathSegment[] {
  const list = devTreeState.lists.find((l) => l.id === listId)
  if (!list) return []
  const path: PathSegment[] = [{ type: 'list', id: list.id, name: list.name }]
  let folderId = list.folder_id
  while (folderId) {
    const folder = devTreeState.folders.find((f) => f.id === folderId)
    if (!folder) break
    path.unshift({ type: 'folder', id: folder.id, name: folder.name })
    folderId = folder.parent_folder_id
  }
  return path
}

/**
 * Fake of `GET /api/v1/search` over the dev items (`VITE_API_MOCKS=1` dev worker only), with the
 * backend's semantics (B-11, AT-12): case-insensitive substring match on the title where `%` and
 * `_` are plain characters, exact matches first, then alphabetical; `q` of 1–200 characters.
 */
export const devSearchHandlers = [
  http.get(url('/api/v1/search'), ({ request }) => {
    const query = new URL(request.url).searchParams
    const q = (query.get('q') ?? '').trim()
    if (q.length < 1 || q.length > 200) return problemResponse(400, 'invalid_parameter')
    const limit = Math.min(Number(query.get('limit') ?? 50), 200)
    const offset = Number(query.get('offset') ?? 0)

    const needle = q.toLowerCase()
    const matching = devItemStore
      .all()
      // Only items of lists that still exist in the (stateful) dev tree.
      .filter((item) => item.title.toLowerCase().includes(needle))
      .filter((item) => devTreeState.lists.some((list) => list.id === item.list_id))
      .sort((a, b) => {
        const exact =
          Number(b.title.toLowerCase() === needle) - Number(a.title.toLowerCase() === needle)
        return exact || a.title.localeCompare(b.title)
      })
    return HttpResponse.json({
      data: matching
        .slice(offset, offset + limit)
        .map((item) => ({ item, path: pathOf(item.list_id) })),
      page: { limit, offset, total: matching.length },
    })
  }),
]
