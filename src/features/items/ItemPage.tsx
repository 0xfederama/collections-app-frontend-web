import { Link, Navigate, useLocation, useParams } from 'react-router'
import { Button, EmptyState, kindIcons } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { useBreakpoint } from '../../lib/breakpoints'
import { ListGate } from '../tree/ListGate'
import { useItem } from './api'
import { EditGuardProvider } from './inline/guard'
import { ItemSkeleton } from './ItemSkeleton'
import { ItemView } from './ItemView'

function ItemDetail({
  listId,
  itemId,
  listName,
}: {
  listId: string
  itemId: string
  listName: string
}) {
  const item = useItem(itemId)
  const { search } = useLocation()
  const backTo = { pathname: `/lists/${listId}`, search }
  const panel = useBreakpoint() === 'wide'

  if (item.status === 'pending') return <ItemSkeleton />
  // A failed background refetch keeps the cached item: only show the error when there is none,
  // or an open field editor (and its draft) would vanish.
  if (item.status === 'error' && !item.data) {
    if (item.error instanceof ApiError && item.error.status === 404) {
      return (
        <EmptyState
          icon={kindIcons.generic}
          headingLevel="h1"
          title="Item not found"
          description="It may have been deleted or moved to Trash."
          action={
            <Link to={backTo} className="text-accent-text underline underline-offset-2">
              Back to {listName}
            </Link>
          }
        />
      )
    }
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p>Couldn’t load this item.</p>
        <Button variant="secondary" onClick={() => void item.refetch()}>
          Retry
        </Button>
      </div>
    )
  }
  // The item lives in another list now (moved elsewhere): show it under its own URL.
  if (item.data.list_id !== listId) {
    return <Navigate to={`/lists/${item.data.list_id}/items/${itemId}`} replace />
  }
  return (
    <div className="flex flex-col gap-4">
      {!panel && (
        <Link
          to={backTo}
          className="self-start text-sm text-accent-text underline underline-offset-2"
        >
          ← Back to {listName}
        </Link>
      )}
      <ItemView item={item.data} />
    </div>
  )
}

/** `/lists/:listId/items/:itemId` content: the shell puts it in `main` or in the detail panel. */
export default function ItemPage() {
  const { listId = '', itemId = '' } = useParams()
  return (
    <ListGate listId={listId}>
      {(list) => (
        // Keyed by item and list: a move opens the same item in its new list with a fresh guard.
        <EditGuardProvider key={`${listId}/${itemId}`}>
          <ItemDetail listId={listId} itemId={itemId} listName={list.name} />
        </EditGuardProvider>
      )}
    </ListGate>
  )
}
