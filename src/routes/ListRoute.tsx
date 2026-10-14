import { useParams } from 'react-router'
import { ListView } from '../features/lists/ListView'
import { ListGate } from '../features/tree/ListGate'

/**
 * `/lists/:listId`. The list view lives in `src/features/lists/*`.
 * The item route (`/lists/:listId/items/:itemId`) renders this same component in `main` at
 * ≥ 1280 px, with the detail panel beside it (see `src/layouts/AppShell.tsx`).
 */
export function ListRoute() {
  const { listId = '' } = useParams()
  return (
    <ListGate listId={listId}>
      {(list) => <ListView key={listId} listId={listId} name={list.name} />}
    </ListGate>
  )
}
