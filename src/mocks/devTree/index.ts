import { http, HttpResponse } from 'msw/http'
import { folderHandlers } from './folderHandlers'
import { listHandlers } from './listHandlers'
import { url, type Folder, type List, type Tree, type TreeDb } from './helpers'

/**
 * A small in-memory fake of the folders and lists endpoints (API.md §3, §4, D-054, D-060): it
 * keeps state, bumps versions, checks `If-Match`, rejects cycles and stale orders, and answers
 * with the same problem shapes as the real backend. Used by `VITE_API_MOCKS=1` dev (through
 * `devData.ts`) and by tests that need a tree that really changes.
 */
export function createTreeBackend(initial: Tree) {
  let counter = 0
  const db: TreeDb = {
    state: {
      folders: structuredClone(initial.folders) as Folder[],
      lists: structuredClone(initial.lists) as List[],
    },
    newId: () => `7c1e5a10-0000-4000-9000-${String(++counter).padStart(12, '0')}`,
    now: () => new Date().toISOString(),
  }
  const { state } = db

  const handlers = [
    http.get(url('/api/v1/tree'), () =>
      HttpResponse.json({ folders: state.folders, lists: state.lists } satisfies Tree),
    ),
    ...folderHandlers(db),
    ...listHandlers(db),
  ]

  return { handlers, state }
}
