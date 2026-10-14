import { useParams } from 'react-router'
import { ListGate } from '../features/tree/ListGate'

/**
 * `/lists/:listId`. W-06 builds the list view here and in `src/features/lists/*`.
 * The item route (`/lists/:listId/items/:itemId`) renders this same component in `main` at
 * ≥ 1280 px, with the detail panel beside it (see `src/layouts/AppShell.tsx`).
 */
export function ListRoute() {
  const { listId = '' } = useParams()
  return (
    <ListGate listId={listId}>
      {(list) => (
        <section>
          <h1 className="font-display text-2xl font-semibold">{list.name}</h1>
          <p className="mt-2 text-sm text-text-muted">List view arrives with W-06.</p>
        </section>
      )}
    </ListGate>
  )
}
