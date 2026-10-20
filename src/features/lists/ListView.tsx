import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { Button, EmptyState, Skeleton, useToast } from '../../components/ui'
import { List as ListIcon } from '../../components/ui/icons'
import { ApiError } from '../../lib/api'
import {
  flattenItems,
  useList,
  useListItems,
  useUpdateList,
  type DisplayMode,
  type List,
  type PinnedFields,
  type SortMode,
} from './api'
import { listKeys } from '../../data/keys'
import { NEW_ITEM_ID, typeDefinition } from '../items'
import { useTypes } from '../settings'
import { ItemsView } from './ItemsView'
import { ItemsSkeleton } from './ItemsSkeleton'
import { ListHeader } from './ListHeader'
import { resolvePinned } from './pinned'
import { useScrollRestore } from './scrollRestore'
import { parseFieldFilter, type FieldFilterValue } from './FieldFilter'
import { activeFieldFilter, buildItemsParams, parseSort, resolveSortOverride } from './listParams'
import { useDebouncedFilter } from './useDebouncedFilter'

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
  const definitions = useTypes()
  const definition = typeDefinition(definitions.data, treeList.type)
  const q = (searchParams.get('q') ?? '').trim()
  const fieldFilter = parseFieldFilter(searchParams, definition?.fields ?? [])
  const activeFilter = activeFieldFilter(fieldFilter)
  // Links to items keep the list's `?q=` and `?sort=`.
  const search = searchParams.size > 0 ? `?${searchParams.toString()}` : ''

  const listQuery = useList(listId)
  const list = listQuery.data
  const sortOverride = resolveSortOverride(parsedSort, definition)
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
  const params = buildItemsParams({ sortOverride, q, filter: fieldFilter, definition })
  const itemsQuery = useListItems(listId, params)
  const { items, total } = flattenItems(itemsQuery.data)
  const updateList = useUpdateList(listId)

  const root = useRef<HTMLDivElement>(null)
  const remember = useScrollRestore(root, itemsQuery.isSuccess)

  const [filter, setFilter] = useDebouncedFilter(q, setSearchParams)

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

  const setFieldFilter = (value: FieldFilterValue | null) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('filter_field')
        next.delete('filter_value')
        next.delete('filter_min')
        next.delete('filter_max')
        if (value) {
          next.set('filter_field', value.field)
          const field = definition?.fields.find((candidate) => candidate.key === value.field)
          if (field?.type === 'text' || field?.type === 'link' || field?.type === 'boolean') {
            if (value.value) next.set('filter_value', value.value)
          } else {
            if (value.min) next.set('filter_min', value.min)
            if (value.max) next.set('filter_max', value.max)
          }
        }
        return next
      },
      { replace: true },
    )
  }

  // A saved URL can outlive its definition. Remove stale keys and malformed values before they
  // reach the API, while retaining unrelated URL state such as sort and title search.
  useEffect(() => {
    if (!definitions.isSuccess) return
    const hasFilterParams = ['filter_field', 'filter_value', 'filter_min', 'filter_max'].some(
      (key) => searchParams.has(key),
    )
    if (hasFilterParams && (!searchParams.has('filter_field') || !fieldFilter)) {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          for (const key of ['filter_field', 'filter_value', 'filter_min', 'filter_max']) {
            next.delete(key)
          }
          return next
        },
        { replace: true },
      )
    }
  }, [definitions.isSuccess, fieldFilter, searchParams, setSearchParams])

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

  const clearFilter = () => {
    setFilter('')
    setFieldFilter(null)
  }
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
  const filtered = q !== '' || activeFilter !== null
  const countLabel = !list
    ? ''
    : filtered && itemsQuery.isSuccess
      ? `${total} of ${list.item_count} ${list.item_count === 1 ? 'item' : 'items'}`
      : `${list.item_count} ${list.item_count === 1 ? 'item' : 'items'}`

  if (!definition) {
    if (definitions.isPending) return <ItemsSkeleton mode={list?.display_mode ?? 'grid'} />
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p>Couldn’t load this list’s type definition.</p>
        <Button variant="secondary" onClick={() => void definitions.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div ref={root} className="flex flex-col gap-4">
      <ListHeader
        treeList={treeList}
        definition={definition}
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
        fieldFilter={fieldFilter}
        onFieldFilter={setFieldFilter}
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
          type={list.type}
          definition={definition}
          pinned={resolvePinned(list, definition)}
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
