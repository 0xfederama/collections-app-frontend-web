import { http, HttpResponse } from 'msw/http'
import type { components } from '../generated/schema'
import { devTreeState } from './devData'
import { devItemStore } from './devItems'
import { problemResponse } from './problems'

type PathSegment = components['schemas']['SearchPathSegment']

const url = (path: string) => `${globalThis.location?.origin ?? ''}${path}`

function pathOf(listId: string): PathSegment[] {
  const list = devTreeState.lists.find((l) => l.id === listId)
  if (!list) return []
  const path: PathSegment[] = [
    { type: 'list', id: list.id, name: list.name, icon: list.icon, icon_color: list.icon_color },
  ]
  let folderId = list.folder_id
  while (folderId) {
    const folder = devTreeState.folders.find((f) => f.id === folderId)
    if (!folder) break
    path.unshift({ type: 'folder', id: folder.id, name: folder.name, icon: null, icon_color: null })
    folderId = folder.parent_folder_id
  }
  return path
}

/** Fake of `GET /api/v1/recent-items` (D-070) over the dev items: `updated_at` descending, then id; `limit` 1–50. */
export const devRecentHandlers = [
  http.get(url('/api/v1/recent-items'), ({ request }) => {
    const raw = new URL(request.url).searchParams.get('limit')
    const limit = raw === null ? 12 : Number(raw)
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return problemResponse(400, 'invalid_parameter')
    }
    const items = devItemStore
      .all()
      .filter((item) => devTreeState.lists.some((list) => list.id === item.list_id))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.id.localeCompare(b.id))
    return HttpResponse.json({
      data: items.slice(0, limit).map((item) => ({ item, path: pathOf(item.list_id) })),
    })
  }),
]
