import type { components } from '../../generated/schema'
import { problemResponse } from '../problems'

export type Folder = components['schemas']['Folder']
export type List = components['schemas']['List']
export type PathSegment = components['schemas']['PathSegment']
export type Tree = components['schemas']['Tree']

/** The fake's state, shared by every handler of one `createTreeBackend` call. */
export interface TreeDb {
  state: { folders: Folder[]; lists: List[] }
  newId: () => string
  now: () => string
}

export const url = (path: string) => `${globalThis.location?.origin ?? ''}${path}`

export const folderOf = (state: TreeDb['state'], id: string | null) =>
  id === null ? undefined : state.folders.find((f) => f.id === id)

/** Next free `sort_order` among the siblings of one parent (`null` = root). */
export const nextOrder = (
  state: TreeDb['state'],
  parent: string | null,
  kind: 'folder' | 'list',
) => {
  const siblings =
    kind === 'folder'
      ? state.folders.filter((f) => f.parent_folder_id === parent)
      : state.lists.filter((l) => l.folder_id === parent)
  return siblings.length === 0 ? 0 : Math.max(...siblings.map((s) => s.sort_order)) + 1
}

type Placed = { id: string; sort_order: number }

/**
 * Puts the folder or list `moving` into `parent` before its sibling `beforeId` (`null` or absent =
 * after the last of its kind), renumbering that kind's siblings `0..n-1` (the planned `before_id` of
 * the move endpoints, api-v4.2.0). Returns false, changing nothing, when `beforeId` is not a sibling
 * of that kind in `parent` (the server answers 422).
 */
export const placeInParent = (
  state: TreeDb['state'],
  parent: string | null,
  kind: 'folder' | 'list',
  moving: Placed,
  beforeId: string | null | undefined,
): boolean => {
  const all: Placed[] =
    kind === 'folder'
      ? state.folders.filter((f) => f.parent_folder_id === parent)
      : state.lists.filter((l) => l.folder_id === parent)
  const others = all
    .filter((s) => s.id !== moving.id)
    .sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : 1))
  const at = beforeId == null ? others.length : others.findIndex((s) => s.id === beforeId)
  if (at < 0) return false
  others.splice(at, 0, moving)
  others.forEach((s, i) => (s.sort_order = i))
  return true
}

/** The folder and all its descendants (folders only), including `id` itself. */
export const descendantsOf = (state: TreeDb['state'], id: string): Set<string> => {
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

/** Missing or malformed `If-Match` is 428; a stale version is 412. Returns a response on failure. */
export const checkMatch = (request: Request, prefix: 'f' | 'l', version: number) => {
  const header = request.headers.get('If-Match')
  if (!header || !/^"[fl]-\d+"$/.test(header)) return problemResponse(428, 'precondition_required')
  if (header !== `"${prefix}-${version}"`) {
    return problemResponse(412, 'version_conflict', { current_version: version })
  }
  return null
}

export const etag = (prefix: string, version: number) => ({ ETag: `"${prefix}-${version}"` })

export const validName = (name: unknown) => {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  return trimmed.length >= 1 && trimmed.length <= 200 ? trimmed : null
}

export const invalid = (field: string, message: string) =>
  problemResponse(422, 'validation_failed', { errors: [{ field, message }] })
