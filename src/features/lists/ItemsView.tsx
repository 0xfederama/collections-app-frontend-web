import { useState } from 'react'
import { Button, EmptyState, useToast } from '../../components/ui'
import { List as ListIcon, Search } from '../../components/ui/icons'
import { ApiError } from '../../lib/api'
import { cx } from '../../lib/cx'
import {
  ITEMS_PAGE_SIZE,
  useReorderItems,
  type DisplayMode,
  type ItemSummary,
  type ItemsParams,
  type SortMode,
} from './api'
import { listKeys } from '../../data/keys'
import type { ItemType, TypeDefinition } from '../items'
import { ItemEntry } from './ItemEntry'
import type { PinnedKeys } from './pinned'
import { SortableProvider, arrayMove, type SortableMove } from '../../components/ui/sortable'
import { containerClass } from './ItemsSkeleton'
import { DraftRow, SortableEntry } from './ItemRows'

export interface ItemsViewProps {
  listId: string
  mode: DisplayMode
  type: ItemType
  definition: TypeDefinition
  pinned: PinnedKeys
  /** e.g. `12 items` or `3 of 12 items`; shown after the items. */
  countLabel: string
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
  /** The draft row of a new item (F008-W9), at the end of the list while its side page is open. */
  draft?: boolean
}

/** The list body: empty states, the items in the display mode, drag-reorder and "Load more". */
export function ItemsView(props: ItemsViewProps) {
  const {
    listId,
    mode,
    type,
    definition,
    pinned,
    items,
    total,
    params,
    effectiveSort,
    hasNextPage,
    search,
  } = props
  const toast = useToast()
  const reorder = useReorderItems(listId)
  const [announcement, setAnnouncement] = useState('')

  if (items.length === 0 && !props.draft) {
    return params.q || params.filterField ? (
      <EmptyState
        icon={Search}
        title="No items match"
        description={
          params.q
            ? `Nothing in this list has “${params.q}” in its title.`
            : 'No items match the selected field filter.'
        }
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
        action={<Button onClick={props.onAddItem}>New item</Button>}
      />
    )
  }

  // Reordering sends every item id, so it needs the whole list in manual order and no filter.
  const canReorder =
    effectiveSort === 'manual' &&
    !params.q &&
    !params.filterField &&
    !hasNextPage &&
    items.length === total &&
    items.length > 1
  const hint = canReorder
    ? null
    : params.q || params.filterField
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
        type={type}
        definition={definition}
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
        type={type}
        definition={definition}
        pinned={pinned}
        search={search}
        onOpen={props.onOpenItem}
      />
    ),
  )

  const draftRow = props.draft ? <DraftRow key="draft" mode={mode} /> : null
  return (
    <div className="flex flex-col gap-3">
      {hint && items.length > 1 && <p className="text-ui text-text-muted">{hint}</p>}
      {canReorder ? (
        <SortableProvider onMove={move}>
          <ul aria-label="Items" className={cx(containerClass[mode])}>
            {entries}
            {draftRow}
          </ul>
        </SortableProvider>
      ) : (
        <ul aria-label="Items" className={cx(containerClass[mode])}>
          {entries}
          {draftRow}
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
      <p className="text-ui text-text-muted">{props.countLabel}</p>
    </div>
  )
}
