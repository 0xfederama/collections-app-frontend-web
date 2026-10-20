import { lazy } from 'react'
import { useParams } from 'react-router'
import { ListGate } from '../features/tree'

// Not in the lists barrel: the shell imports it eagerly, and the barrel re-exporting the list view
// would pull the whole list screen into the main bundle (F020-W3). The route's Suspense covers the load.
const ListView = lazy(() =>
  import('../features/lists/ListView').then((m) => ({ default: m.ListView })),
)

/**
 * `/lists/:listId`. The list view lives in `src/features/lists/*`.
 * The item route (`/lists/:listId/items/:itemId`) renders this same component in `main` at
 * ≥ 1280 px, with the detail panel beside it (see `src/layouts/AppShell.tsx`).
 */
export function ListRoute() {
  const { listId = '' } = useParams()
  return <ListGate listId={listId}>{(list) => <ListView key={listId} treeList={list} />}</ListGate>
}
