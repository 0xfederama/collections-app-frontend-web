import { useEffect } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { Button, EmptyState, typeIconFor } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { cx } from '../../lib/cx'
import { useBreakpoint } from '../../lib/breakpoints'
import { ListGate } from '../tree/ListGate'
import { useItem } from './api'
import { EditGuardProvider } from './inline/guard'
import { ItemSkeleton } from './ItemSkeleton'
import { ItemView } from './ItemView'
import { NEW_ITEM_ID } from './newItem'
import { NewItemDraft } from './NewItemDraft'
import type { ItemType } from './api'

/** Text entry, or a layer that owns Escape (dialog, menu, listbox, expanded popup). */
const OWNS_ESCAPE =
  'input, textarea, select, [contenteditable="true"], .cm-editor, [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [aria-expanded="true"]'

/**
 * Escape closes the opened item and returns to its list (the same place as "Close details"). It
 * stays out of the way of everything that already uses Escape: a field editor or the description
 * editor (they stop the key themselves), an open dialog, menu or popup, and any text entry.
 */
function useEscapeToList(to: { pathname: string; search: string }) {
  const navigate = useNavigate()
  const { pathname, search } = to
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
      const target = event.target as Element | null
      if (target?.closest?.(OWNS_ESCAPE)) return
      if (
        document.querySelector(
          '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
        )
      )
        return
      void navigate({ pathname, search })
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navigate, pathname, search])
}

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
  useEscapeToList(backTo)
  const panel = useBreakpoint() === 'wide'

  if (item.status === 'pending') return <ItemSkeleton />
  // A failed background refetch keeps the cached item: only show the error when there is none,
  // or an open field editor (and its draft) would vanish.
  if (item.status === 'error' && !item.data) {
    if (item.error instanceof ApiError && item.error.status === 404) {
      return (
        <EmptyState
          icon={typeIconFor(null)}
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
    <div className={cx('flex flex-col gap-4', panel && 'min-h-0 flex-1')}>
      {!panel && (
        <Link
          to={backTo}
          className="self-start text-sm text-accent-text underline underline-offset-2"
        >
          ← Back to {listName}
        </Link>
      )}
      <ItemView item={item.data} pinned={panel} />
    </div>
  )
}

/** `/lists/:listId/items/new` (F008-W9): the draft of a new item, with the same back link as an item. */
function NewItemPage({
  listId,
  listName,
  type,
}: {
  listId: string
  listName: string
  type: ItemType
}) {
  const { search } = useLocation()
  const panel = useBreakpoint() === 'wide'
  return (
    <div className={cx('flex flex-col gap-4', panel && 'min-h-0 flex-1')}>
      {!panel && (
        <Link
          to={{ pathname: `/lists/${listId}`, search }}
          className="self-start text-sm text-accent-text underline underline-offset-2"
        >
          ← Back to {listName}
        </Link>
      )}
      <NewItemDraft listId={listId} listName={listName} type={type} />
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
          {itemId === NEW_ITEM_ID ? (
            <NewItemPage listId={listId} listName={list.name} type={list.type} />
          ) : (
            <ItemDetail listId={listId} itemId={itemId} listName={list.name} />
          )}
        </EditGuardProvider>
      )}
    </ListGate>
  )
}
