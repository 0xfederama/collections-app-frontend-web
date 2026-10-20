import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { ApiError, api, ifMatch, unwrap } from '../../lib/api'
import { treeKeys } from '../tree'

export type List = components['schemas']['List']
export type ItemSummary = components['schemas']['ItemSummary']
type ItemPage = components['schemas']['ItemPage']
export type DisplayMode = components['schemas']['DisplayMode']
export type SortMode = components['schemas']['SortMode']
export type PinnedFields = components['schemas']['PinnedFields']

/** Max page size of `GET /lists/{id}/items` (D-018). */
export const ITEMS_PAGE_SIZE = 200

export interface ItemsParams {
  /** The URL override; `null` lets the server use the list's `sort_mode` (D-063). */
  sort: SortMode | null
  q: string
  filterField: string | null
  filterValue: string | null
  filterMin: string | null
  filterMax: string | null
}

/** Exported so other features (W-05, W-07, W-08) invalidate by key, not by string literal. */
export const listKeys = {
  detail: (listId: string) => ['lists', listId, 'detail'] as const,
  /** Prefix of every items query of a list, whatever its sort or filter. */
  items: (listId: string) => ['lists', listId, 'items'] as const,
  itemsQuery: (listId: string, params: ItemsParams) =>
    [
      'lists',
      listId,
      'items',
      params.sort,
      params.q,
      params.filterField,
      params.filterValue,
      params.filterMin,
      params.filterMax,
    ] as const,
}

export function useList(listId: string) {
  return useQuery({
    queryKey: listKeys.detail(listId),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/lists/{id}', { params: { path: { id: listId } }, signal })),
  })
}

export function useListItems(listId: string, params: ItemsParams) {
  return useInfiniteQuery({
    queryKey: listKeys.itemsQuery(listId, params),
    initialPageParam: 0,
    queryFn: ({ signal, pageParam }) =>
      unwrap(
        api.GET('/api/v1/lists/{id}/items', {
          params: {
            path: { id: listId },
            query: {
              ...(params.sort ? { sort: params.sort } : {}),
              ...(params.q ? { q: params.q } : {}),
              ...(params.filterField ? { filter_field: params.filterField } : {}),
              ...(params.filterValue !== null ? { filter_value: params.filterValue } : {}),
              ...(params.filterMin !== null ? { filter_min: params.filterMin } : {}),
              ...(params.filterMax !== null ? { filter_max: params.filterMax } : {}),
              limit: ITEMS_PAGE_SIZE,
              offset: pageParam,
            },
          },
          signal,
        }),
      ),
    getNextPageParam: (last) => {
      const next = last.page.offset + last.data.length
      return last.data.length > 0 && next < last.page.total ? next : undefined
    },
  })
}

export type ItemsData = InfiniteData<ItemPage, unknown>

/** Flat items of all loaded pages, plus the server's total for the query. */
export function flattenItems(data: ItemsData | undefined) {
  return {
    items: data?.pages.flatMap((page) => page.data) ?? [],
    total: data?.pages[0]?.page.total ?? 0,
  }
}

type ListPatch =
  { display_mode: DisplayMode } | { sort_mode: SortMode } | { pinned_fields: PinnedFields }

/**
 * PATCH a list's `display_mode`, `sort_mode` or `pinned_fields` (`null` resets to the type default). `If-Match` is built from the version in the cache
 * at call time, and calls for one list run one after another so quick successive changes do not
 * conflict with each other. A 412 is never retried: the caller refetches and tells the user.
 * The change shows at once and is rolled back on failure.
 */
export function useUpdateList(listId: string) {
  const client = useQueryClient()
  const key = listKeys.detail(listId)
  return useMutation({
    scope: { id: `list-${listId}` },
    mutationFn: async (patch: ListPatch) => {
      const current = client.getQueryData<List>(key)
      if (!current) throw new Error('The list is not loaded')
      return unwrap(
        api.PATCH('/api/v1/lists/{id}', {
          params: { path: { id: listId }, header: ifMatch('list', current.version) },
          body: patch,
        }),
      )
    },
    onMutate: async (patch) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<List>(key)
      if (previous) client.setQueryData<List>(key, { ...previous, ...patch })
      return { previous }
    },
    onError: (error, _patch, context) => {
      if (context?.previous) client.setQueryData(key, context.previous)
      // A stale version means someone else changed the list: show their latest state.
      if (error instanceof ApiError && error.status === 412) {
        void client.invalidateQueries({ queryKey: key })
      }
    },
    onSuccess: (updated, patch) => {
      client.setQueryData<List>(key, (old) => (old ? { ...old, ...updated } : updated))
      void client.invalidateQueries({ queryKey: treeKeys.tree })
      // A new default sort changes what the server returns when no `?sort=` is given.
      if ('sort_mode' in patch) void client.invalidateQueries({ queryKey: listKeys.items(listId) })
    },
  })
}

/**
 * PUT the full active item order (API.md: all item ids, no `If-Match`). Optimistic: the new order
 * shows at once in the query at `key`, and is rolled back if the call fails. The items are
 * refetched either way; the caller reacts to 409 `order_stale` (toast).
 */
export function useReorderItems(listId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ order }: { key: ItemsKey; order: string[] }) => {
      await api.PUT('/api/v1/lists/{id}/items/order', {
        params: { path: { id: listId } },
        body: { ids: order },
      })
    },
    onMutate: async ({ key, order }) => {
      await client.cancelQueries({ queryKey: listKeys.items(listId) })
      const snapshot = client.getQueryData<ItemsData>(key)
      if (snapshot) client.setQueryData<ItemsData>(key, applyOrder(snapshot, order))
      return { snapshot }
    },
    onError: (_error, { key }, context) => {
      if (context?.snapshot) client.setQueryData(key, context.snapshot)
    },
    onSettled: () => client.invalidateQueries({ queryKey: listKeys.items(listId) }),
  })
}

export type ItemsKey = ReturnType<typeof listKeys.itemsQuery>

/** `data` with the loaded items rearranged into `order`; page boundaries are kept. */
function applyOrder(data: ItemsData, order: readonly string[]): ItemsData {
  const byId = new Map(data.pages.flatMap((page) => page.data).map((item) => [item.id, item]))
  let cursor = 0
  return {
    ...data,
    pages: data.pages.map((page) => {
      const slice = order.slice(cursor, cursor + page.data.length)
      cursor += page.data.length
      return { ...page, data: slice.map((id) => byId.get(id)).filter((i): i is ItemSummary => !!i) }
    }),
  }
}
