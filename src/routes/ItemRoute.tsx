import { useParams } from 'react-router'
import { ListGate } from '../features/tree/ListGate'

/**
 * `/lists/:listId/items/:itemId`. W-07 replaces the body of this component with the item detail.
 * The shell renders it full page in `main` below 1280 px and in the detail panel at ≥ 1280 px.
 */
export function ItemRoute() {
  const { listId = '', itemId = '' } = useParams()
  return (
    <ListGate listId={listId}>
      {() => (
        <section>
          <h1 className="font-display text-2xl font-semibold">Item</h1>
          <p className="mt-2 text-sm break-all text-text-muted">
            Item detail arrives with W-07. Item id: {itemId}
          </p>
        </section>
      )}
    </ListGate>
  )
}
