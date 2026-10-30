import { Link } from 'react-router'
import { Button, focusRing, Skeleton } from '../../components/ui'
import { List as ListIcon } from '../../components/ui/icons'
import type { List, TreeIndex } from '../tree'

/** Every list, most recently updated first (ties by name), with the folders that hold it. */
function listsByRecency(index: TreeIndex): { list: List; where: string }[] {
  return [...index.lists.values()]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at) || a.name.localeCompare(b.name))
    .map((list) => ({
      list,
      where: index
        .ancestorsOf(list.id)
        .map((folder) => folder.name)
        .join(' › '),
    }))
}

export function QuickLinksSkeleton() {
  return (
    <div role="status" className="grid gap-2 sm:grid-cols-2">
      <span className="sr-only">Loading lists</span>
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  )
}

export function QuickLinksError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2">
      <p>Couldn’t load your lists.</p>
      <Button variant="secondary" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}

/** Links to every list, newest change first. The sidebar has the full tree; this is the shortcut. */
export function QuickLinks({ index }: { index: TreeIndex }) {
  const rows = listsByRecency(index)
  return (
    <ul aria-label="Your lists" className="grid gap-2 sm:grid-cols-2">
      {rows.map(({ list, where }) => (
        <li key={list.id}>
          <Link
            to={`/lists/${list.id}`}
            className={`flex h-full items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:bg-surface-raised ${focusRing}`}
          >
            <span
              aria-hidden
              className="grid size-8 shrink-0 place-items-center rounded-sm border border-border bg-fill text-text-muted"
            >
              <ListIcon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-row text-text">{list.name}</span>
              <span className="block truncate text-secondary text-text-muted">
                {where && <span className="sr-only">in </span>}
                {where && `${where} · `}
                {list.item_count === 1 ? '1 item' : `${list.item_count} items`}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
