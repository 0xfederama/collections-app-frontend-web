import { useState } from 'react'
import { Button, EmptyState, Skeleton, useToast } from '../../components/ui'
import { List as ListIcon, Search } from '../../components/ui/icons'
import { ApiError } from '../../lib/api'
import { cx } from '../../lib/cx'
import {
  ITEMS_PAGE_SIZE,
  listKeys,
  useReorderItems,
  type DisplayMode,
  type ItemSummary,
  type ItemsParams,
  type SortMode,
} from './api'
import type { ItemKind } from '../items/api'
import { ItemEntry } from './ItemEntry'
import type { PinnedSlots } from './pinned'
import {
  SortableProvider,
  arrayMove,
  useSortableRow,
  type SortableMove,
} from '../../components/ui/sortable'

/** Container classes per mode. Grid: 2 columns on mobile, 3 on tablet, then auto-fill (UI_SPEC §2). */
const containerClass: Record<DisplayMode, string> = {
  compact: 'flex flex-col gap-1.5',
  thumbnail: 'flex flex-col gap-2',
  grid: 'grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-[repeat(auto-fill,minmax(11.25rem,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(13.75rem,1fr))]',
}

export function ItemsSkeleton({ mode }: { mode: DisplayMode }) {
  const count = mode === 'grid' ? 6 : 5
  return (
    <div role="status" data-testid="items-skeleton" className={containerClass[mode]}>
      <span className="sr-only">Loading items</span>
      {Array.from({ length: count }, (_, i) =>
        mode === 'grid' ? (
          <div
            key={i}
            aria-hidden
            className="flex flex-col gap-2 rounded-lg border border-border p-0"
          >
            <Skeleton className="aspect-4/3 w-full rounded-b-none" />
            <div className="flex flex-col gap-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ) : (
          <div
            key={i}
            aria-hidden
            className="flex items-center gap-3 rounded-lg border border-border p-1.5"
          >
            <Skeleton className={mode === 'compact' ? 'size-10' : 'aspect-4/3 w-24'} />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              {mode === 'thumbnail' && <Skeleton className="h-4 w-3/4" />}
            </div>
          </div>
        ),
      )}
    </div>
  )
}

export interface ItemsViewProps {
  listId: string
  mode: DisplayMode
  kind: ItemKind
  pinned: PinnedSlots
  items: ItemSummary[]
  total: number
  /** The query the items belong to (its cache entry is reordered optimistically). */
  params: ItemsParams
  /** The sort in effect: the URL override, else the list's `sort_mode`. */
  effectiveSort: SortMode
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  /** Query string carried to item URLs. */
  search: string
  onOpenItem: () => void
  onClearFilter: () => void
  onAddItem: () => void
}

/** The list body: empty states, the items in the display mode, drag-reorder and "Load more". */
export function ItemsView(props: ItemsViewProps) {
  const { listId, mode, kind, pinned, items, total, params, effectiveSort, hasNextPage, search } =
    props
  const toast = useToast()
  const reorder = useReorderItems(listId)
  const [announcement, setAnnouncement] = useState('')

  if (items.length === 0) {
    return params.q ? (
      <EmptyState
        icon={Search}
        title="No items match"
        description={`Nothing in this list has “${params.q}” in its title.`}
        action={
          <Button variant="secondary" onClick={props.onClearFilter}>
            Clear filter
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={ListIcon}
        title="No items yet"
        description="Add the first item to this list."
        action={<Button onClick={props.onAddItem}>Add item</Button>}
      />
    )
  }

  // Reordering sends every item id, so it needs the whole list in manual order and no filter.
  const canReorder =
    effectiveSort === 'manual' &&
    !params.q &&
    !hasNextPage &&
    items.length === total &&
    items.length > 1
  const hint = canReorder
    ? null
    : params.q
      ? 'Clear the filter to reorder items.'
      : effectiveSort !== 'manual'
        ? 'Switch to Manual sort to reorder items.'
        : hasNextPage
          ? 'Load all items to reorder them.'
          : null

  const move = ({ from, to }: Pick<SortableMove, 'from' | 'to'>) => {
    if (from === to || to < 0 || to >= items.length) return
    const moved = items[from]
    if (!moved) return
    const order = arrayMove(
      items.map((item) => item.id),
      from,
      to,
    )
    setAnnouncement(`Moved ${moved.title} to position ${to + 1} of ${items.length}.`)
    reorder.mutate(
      { key: listKeys.itemsQuery(listId, params), order },
      {
        onError: (error) => {
          setAnnouncement('')
          if (error instanceof ApiError && error.code === 'order_stale') {
            toast({ kind: 'info', title: 'List changed, order refreshed.' })
          } else {
            toast({
              kind: 'error',
              title: 'Couldn’t save the new order',
              description: 'The previous order was restored.',
            })
          }
        },
      },
    )
  }

  const entries = items.map((item, index) =>
    canReorder ? (
      <SortableEntry
        key={item.id}
        item={item}
        index={index}
        size={items.length}
        mode={mode}
        kind={kind}
        pinned={pinned}
        search={search}
        onOpen={props.onOpenItem}
        onMoveBy={(delta) => move({ from: index, to: index + delta })}
      />
    ) : (
      <ItemEntry
        key={item.id}
        item={item}
        mode={mode}
        kind={kind}
        pinned={pinned}
        search={search}
        onOpen={props.onOpenItem}
      />
    ),
  )

  return (
    <div className="flex flex-col gap-3">
      {hint && items.length > 1 && <p className="text-sm text-text-muted">{hint}</p>}
      {canReorder ? (
        <SortableProvider onMove={move}>
          <ul aria-label="Items" className={cx(containerClass[mode])}>
            {entries}
          </ul>
        </SortableProvider>
      ) : (
        <ul aria-label="Items" className={cx(containerClass[mode])}>
          {entries}
        </ul>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={props.onLoadMore}
            disabled={props.isFetchingNextPage}
          >
            {props.isFetchingNextPage
              ? 'Loading…'
              : `Load more (${Math.min(ITEMS_PAGE_SIZE, total - items.length)} of ${total - items.length} remaining)`}
          </Button>
        </div>
      )}
    </div>
  )
}

function SortableEntry({
  item,
  index,
  size,
  mode,
  kind,
  pinned,
  search,
  onOpen,
  onMoveBy,
}: {
  item: ItemSummary
  index: number
  size: number
  mode: DisplayMode
  kind: ItemKind
  pinned: PinnedSlots
  search: string
  onOpen: () => void
  onMoveBy: (delta: -1 | 1) => void
}) {
  const { ref, handleRef, isDragging } = useSortableRow(item.id, {
    group: 'items',
    index,
    size,
    label: item.title,
  })
  return (
    <ItemEntry
      item={item}
      mode={mode}
      kind={kind}
      pinned={pinned}
      search={search}
      onOpen={onOpen}
      reorder={{
        rowRef: ref,
        handleRef,
        isDragging,
        canMoveUp: index > 0,
        canMoveDown: index < size - 1,
        onMoveBy,
      }}
    />
  )
}
