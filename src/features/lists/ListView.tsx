import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Button, EmptyState, Skeleton, useToast } from '../../components/ui'
import { List as ListIcon } from '../../components/ui/icons'
import { ApiError } from '../../lib/api'
import {
  flattenItems,
  useList,
  useListItems,
  useUpdateList,
  listKeys,
  type DisplayMode,
  type List,
  type PinnedFields,
  type SortMode,
} from './api'
import { NEW_ITEM_ID } from '../items/newItem'
import { hasPrice } from '../items/kinds'
import { ItemsSkeleton, ItemsView } from './ItemsView'
import { ListHeader } from './ListHeader'
import { resolvePinned } from './pinned'
import { useScrollRestore } from './scrollRestore'

const SORTS: readonly SortMode[] = ['manual', 'title', 'updated', 'price', 'kind_key']
const FILTER_DEBOUNCE_MS = 250

function parseSort(value: string | null): SortMode | null {
  return SORTS.find((sort) => sort === value) ?? null
}

/**
 * The list screen in the shell. URL state (UI_SPEC §1, D-063): `?q=` is the title
 * filter and `?sort=` overrides the list's saved `sort_mode`. Display mode is saved on the list.
 */
export function ListView({ treeList }: { treeList: List }) {
  const listId = treeList.id
  const client = useQueryClient()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const parsedSort = parseSort(searchParams.get('sort'))
  const q = (searchParams.get('q') ?? '').trim()
  // Links to items keep the list's `?q=` and `?sort=`.
  const search = searchParams.size > 0 ? `?${searchParams.toString()}` : ''

  const listQuery = useList(listId)
  const list = listQuery.data
  // A sort the list's kind does not define falls back to the list's mode, so a stale bookmark (or a
  // kind change) cannot put the list in a sort the server rejects: `kind_key` on a generic list
  // (F007-W9), `price` where the kind has no price (D-085).
  const sortOverride =
    (parsedSort === 'kind_key' && treeList.kind === 'generic') ||
    (parsedSort === 'price' && !hasPrice(treeList.kind))
      ? null
      : parsedSort
  // The tree is the source of truth for renames, moves and description edits (W-05 refetches it
  // after each one). When it holds a newer version than our detail, refetch the detail, or the
  // next `If-Match` would be stale and fail with a 412.
  const treeVersion = treeList.version
  useEffect(() => {
    const cached = client.getQueryData<List>(listKeys.detail(listId))
    if (cached && cached.version !== treeVersion) {
      void client.invalidateQueries({ queryKey: listKeys.detail(listId) })
    }
  }, [client, listId, treeVersion])
  const params = { sort: sortOverride, q }
  const itemsQuery = useListItems(listId, params)
  const { items, total } = flattenItems(itemsQuery.data)
  const updateList = useUpdateList(listId)

  const root = useRef<HTMLDivElement>(null)
  const remember = useScrollRestore(root, itemsQuery.isSuccess)

  // The filter field updates at once; the URL follows after a pause.
  const [filter, setFilter] = useState(q)
  useEffect(() => {
    if (filter.trim() === q) return
    const timer = setTimeout(() => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (filter.trim()) next.set('q', filter.trim())
          else next.delete('q')
          return next
        },
        { replace: true },
      )
    }, FILTER_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [filter, q, setSearchParams])
  // The URL changed elsewhere (back/forward): the field follows it.
  const [seenQ, setSeenQ] = useState(q)
  if (q !== seenQ) {
    setSeenQ(q)
    if (filter.trim() !== q) setFilter(q)
  }

  const effectiveSort = sortOverride ?? list?.sort_mode ?? 'manual'
  const setSort = (sort: SortMode) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        // Choosing the saved sort needs no override.
        if (sort === list?.sort_mode) next.delete('sort')
        else next.set('sort', sort)
        return next
      },
      { replace: true },
    )

  const onUpdateError = (error: Error) => {
    if (error instanceof ApiError && error.status === 412) {
      toast({
        kind: 'error',
        title: 'This list was changed elsewhere',
        description: 'It has been refreshed. Try again.',
      })
    } else {
      toast({ kind: 'error', title: 'Couldn’t save the change', description: 'Try again.' })
    }
  }
  const setDisplayMode = (display_mode: DisplayMode) =>
    updateList.mutate({ display_mode }, { onError: onUpdateError })
  const setPinned = (pinned_fields: PinnedFields) =>
    updateList.mutate({ pinned_fields }, { onError: onUpdateError })
  const resetPinned = () => updateList.mutate({ pinned_fields: null }, { onError: onUpdateError })
  const makeDefault = () =>
    updateList.mutate(
      { sort_mode: effectiveSort },
      {
        onSuccess: () => toast({ kind: 'success', title: 'Default sort saved' }),
        onError: onUpdateError,
      },
    )

  const clearFilter = () => setFilter('')
  // F008-W9: "New item" opens the draft item page; the draft row shows while that route is open.
  const navigate = useNavigate()
  const draft = useParams().itemId === NEW_ITEM_ID
  const addItem = () =>
    void navigate({ pathname: `/lists/${listId}/items/${NEW_ITEM_ID}`, search }, { replace: draft })

  if (listQuery.isError) {
    if (listQuery.error instanceof ApiError && listQuery.error.status === 404) {
      return (
        <EmptyState
          icon={ListIcon}
          headingLevel="h1"
          title="List not found"
          description="It may have been deleted or moved to Trash."
        />
      )
    }
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p>Couldn’t load this list.</p>
        <Button variant="secondary" onClick={() => void listQuery.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  const mode = list?.display_mode ?? 'grid'
  const filtered = q !== ''
  const countLabel = !list
    ? ''
    : filtered && itemsQuery.isSuccess
      ? `${total} of ${list.item_count} ${list.item_count === 1 ? 'item' : 'items'}`
      : `${list.item_count} ${list.item_count === 1 ? 'item' : 'items'}`

  return (
    <div ref={root} className="flex flex-col gap-4">
      <ListHeader
        treeList={treeList}
        list={list}
        showAddItem={!!list && (list.item_count > 0 || draft)}
        displayMode={mode}
        onDisplayMode={setDisplayMode}
        sort={effectiveSort}
        onSort={setSort}
        canMakeDefault={!!list && effectiveSort !== list.sort_mode}
        onMakeDefault={makeDefault}
        makeDefaultPending={updateList.isPending}
        filter={filter}
        onFilter={setFilter}
        onPinned={setPinned}
        onResetPinned={resetPinned}
        onAddItem={addItem}
      />
      {itemsQuery.isError ? (
        <div role="alert" className="flex flex-col items-start gap-2">
          <p>Couldn’t load the items.</p>
          <Button variant="secondary" onClick={() => void itemsQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : !itemsQuery.isSuccess || !list ? (
        <>
          <ItemsSkeleton mode={mode} />
          {!list && <Skeleton className="sr-only" />}
        </>
      ) : (
        <ItemsView
          listId={listId}
          mode={mode}
          kind={list.kind}
          pinned={resolvePinned(list)}
          countLabel={countLabel}
          items={items}
          total={total}
          params={params}
          effectiveSort={effectiveSort}
          hasNextPage={itemsQuery.hasNextPage}
          isFetchingNextPage={itemsQuery.isFetchingNextPage}
          onLoadMore={() => void itemsQuery.fetchNextPage()}
          search={search}
          onOpenItem={remember}
          onClearFilter={clearFilter}
          onAddItem={addItem}
          draft={draft}
        />
      )}
    </div>
  )
}
