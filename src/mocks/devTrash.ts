import { http, HttpResponse } from 'msw/http'
import type { components } from '../generated/schema'
import { problemResponse } from './problems'

type TrashEntry = components['schemas']['TrashEntry']
type PathSegment = components['schemas']['PathSegment']

const url = (path: string) => `${globalThis.location?.origin ?? ''}${path}`
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isUuid = (value: unknown) => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)

/**
 * A small in-memory fake of the trash endpoints (API.md Trash, D-065): newest first, paginated,
 * restore in place (`409 parent_in_trash` with `blocking_parent` while the parent's own batch is
 * still there) or to a destination (shape checked, `422` otherwise), and purge (nested older
 * entries go with it). Used by `VITE_API_MOCKS=1` dev (through `devTrashHandlers`) and by tests.
 *
 * It is NOT synced with the dev tree or items (those are the stateful fakes of W-05/W-08):
 * restoring here does not bring anything back into the sidebar.
 */
export function createTrashBackend(initial: readonly TrashEntry[]) {
  const state = { entries: structuredClone(initial) as TrashEntry[] }
  const find = (id: string) => state.entries.find((e) => e.id === id)
  const parentOf = (entry: TrashEntry): PathSegment | undefined => entry.former_path.at(-1)
  const handlers = [
    http.get(url('/api/v1/trash'), ({ request }) => {
      const query = new URL(request.url).searchParams
      const limit = Math.min(Number(query.get('limit') ?? 50), 200)
      const offset = Number(query.get('offset') ?? 0)
      const sorted = [...state.entries].sort((a, b) => b.deleted_at.localeCompare(a.deleted_at))
      return HttpResponse.json({
        data: sorted.slice(offset, offset + limit),
        page: { limit, offset, total: sorted.length },
      })
    }),

    http.post(url('/api/v1/trash/:batchId/restore'), async ({ params, request }) => {
      const entry = find(String(params.batchId))
      if (!entry) return problemResponse(404, 'not_found')

      const text = await request.text()
      const body: unknown = text ? JSON.parse(text) : {}
      const destination = isRecord(body) ? body.destination : undefined
      if (destination === undefined) {
        const parent = parentOf(entry)
        if (!entry.restorable_in_place && parent) {
          return problemResponse(409, 'parent_in_trash', { blocking_parent: parent })
        }
      } else {
        const key = entry.root_type === 'item' ? 'list_id' : 'folder_id'
        const valid =
          isRecord(destination) &&
          key in destination &&
          (destination[key] === null ? key === 'folder_id' : isUuid(destination[key]))
        if (!valid) {
          return problemResponse(422, 'validation_failed', {
            errors: [{ field: `destination.${key}`, message: `${key} is required` }],
          })
        }
      }

      state.entries = state.entries.filter((e) => e.id !== entry.id)
      // Entries that waited for this one to come back can now be restored in place.
      for (const other of state.entries) {
        if (parentOf(other)?.id === entry.root_id) other.restorable_in_place = true
      }
      return HttpResponse.json({ root_type: entry.root_type, root_id: entry.root_id })
    }),

    http.delete(url('/api/v1/trash/:batchId'), ({ params }) => {
      const entry = find(String(params.batchId))
      if (!entry) return problemResponse(404, 'not_found')
      // Purging a folder or list also purges older entries that were inside it.
      state.entries = state.entries.filter(
        (e) => e.id !== entry.id && !e.former_path.some((segment) => segment.id === entry.root_id),
      )
      return new HttpResponse(null, { status: 204 })
    }),

    http.delete(url('/api/v1/trash'), () => {
      state.entries = []
      return new HttpResponse(null, { status: 204 })
    }),
  ]

  return { handlers, state }
}

const id = (n: number) => `7c1e5a10-0000-4000-8000-${String(n + 4000).padStart(12, '0')}`
const hoursAgo = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString()
const media: PathSegment = { type: 'folder', id: id(1), name: 'Media' }
const crime: PathSegment = { type: 'list', id: id(2), name: 'Crime' }

/** Newest first: an old folder, a blocked item whose parent list is also in Trash, and so on. */
export const devTrash: TrashEntry[] = [
  {
    id: id(101),
    root_type: 'list',
    root_id: id(2),
    root_name: 'Crime',
    former_path: [media],
    deleted_at: hoursAgo(1),
    counts: { folders: 0, lists: 1, items: 3 },
    restorable_in_place: true,
  },
  {
    // Its parent list "Crime" is the root of the entry above: "Restore 'Crime' instead" is offered.
    id: id(102),
    root_type: 'item',
    root_id: id(3),
    root_name: 'Heat',
    former_path: [media, crime],
    deleted_at: hoursAgo(26),
    counts: { folders: 0, lists: 0, items: 1 },
    restorable_in_place: false,
  },
  {
    id: id(103),
    root_type: 'folder',
    root_id: id(4),
    root_name: 'Old media',
    former_path: [],
    deleted_at: hoursAgo(72),
    counts: { folders: 2, lists: 3, items: 41 },
    restorable_in_place: true,
  },
  {
    // The parent's batch is not in the trash, so the web can't tell what blocks it: picker only.
    id: id(104),
    root_type: 'item',
    root_id: id(5),
    root_name: 'Tenet',
    former_path: [media, { type: 'list', id: id(6), name: 'Sci-fi' }],
    deleted_at: hoursAgo(200),
    counts: { folders: 0, lists: 0, items: 1 },
    restorable_in_place: false,
  },
  {
    id: id(105),
    root_type: 'list',
    root_id: id(7),
    root_name: 'Old cameras',
    former_path: [{ type: 'folder', id: id(8), name: 'Vehicles' }],
    deleted_at: hoursAgo(24 * 20),
    counts: { folders: 0, lists: 1, items: 17 },
    restorable_in_place: true,
  },
]

export const devTrashHandlers = createTrashBackend(devTrash).handlers
