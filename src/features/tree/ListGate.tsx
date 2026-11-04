import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button, EmptyState, Skeleton } from '../../components/ui'
import { List as ListIcon } from '../../components/ui/icons'
import { useTreeIndex, type Folder, type List } from './api'

/**
 * Resolves a list id against the sidebar tree and renders the loading, error and not-found
 * states, so routes under `/lists/:listId` never crash on an unknown id.
 */
export function ListGate({
  listId,
  children,
  slot,
}: {
  listId: string
  /** The leading control of the header row: the back control of a sub-page; none for top pages. */
  slot?: ReactNode
  children: (list: List, ancestors: Folder[]) => ReactNode
}) {
  const result = useTreeIndex()

  if (result.status === 'pending') {
    return (
      <div role="status" className="flex flex-col gap-3">
        <span className="sr-only">Loading list</span>
        <div className="flex items-center gap-3">
          {slot}
          <Skeleton className="h-8 w-1/3" />
        </div>
        <Skeleton className="h-24" />
      </div>
    )
  }
  if (result.status === 'error') {
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-3">
          {slot}
          <p>Couldn’t load this list.</p>
        </div>
        <Button variant="secondary" onClick={result.refetch}>
          Retry
        </Button>
      </div>
    )
  }
  const list = result.index.lists.get(listId)
  if (!list) {
    return (
      <>
        <div className="mb-3 flex empty:hidden">{slot}</div>
        <EmptyState
          icon={ListIcon}
          headingLevel="h1"
          title="List not found"
          description="It may have been deleted or moved to Trash."
          action={
            <Link to="/" className="text-accent-text underline underline-offset-2">
              Back to home
            </Link>
          }
        />
      </>
    )
  }
  return children(list, result.index.ancestorsOf(listId))
}
