import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { ApiError, api, unwrap } from '../../lib/api'
import { searchKeys } from '../search/api'
import { treeKeys } from '../tree/api'

export type TrashEntry = components['schemas']['TrashEntry']
export type TrashPage = components['schemas']['TrashPage']
export type RestoreResult = components['schemas']['RestoreResult']
/** `folder_id` (`null` = top level) for a folder or list root, `list_id` for an item root. */
export type RestoreDestination = { folder_id: string | null } | { list_id: string }

/** Exported so other features can invalidate the trash by key, not by string literal. */
export const trashKeys = { all: ['trash'] as const, list: ['trash', 'list'] as const }

/** First path segment of the list and item query keys (`listKeys`, `itemKeys`); see `trash/api.test.ts`. */
export const LISTS_KEY_ROOT = 'lists'
export const ITEMS_KEY_ROOT = 'items'

/** Rows per request (the API default). */
export const TRASH_PAGE_SIZE = 50

/**
 * Trash entries, newest first, loaded by offset. Always refetched when the page opens: the delete
 * actions elsewhere (W-05, W-07) don't know about this query, so a cached list would be stale.
 */
export function useTrash() {
  return useInfiniteQuery({
    queryKey: trashKeys.list,
    initialPageParam: 0,
    queryFn: ({ signal, pageParam }) =>
      unwrap(
        api.GET('/api/v1/trash', {
          params: { query: { limit: TRASH_PAGE_SIZE, offset: pageParam } },
          signal,
        }),
      ),
    staleTime: 0,
    refetchOnMount: 'always',
    getNextPageParam: (last) => {
      const next = last.page.offset + last.data.length
      return last.data.length > 0 && next < last.page.total ? next : undefined
    },
  })
}

/** A restore or purge changes what the tree, the lists, the items and the search can show. */
function invalidateWorkspace(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: trashKeys.all }),
    queryClient.invalidateQueries({ queryKey: treeKeys.tree }),
    queryClient.invalidateQueries({ queryKey: [LISTS_KEY_ROOT] }),
    queryClient.invalidateQueries({ queryKey: [ITEMS_KEY_ROOT] }),
    queryClient.invalidateQueries({ queryKey: searchKeys.all }),
  ])
}

/** After a 404 (already restored or purged elsewhere) or 409 the screen may be stale: refetch. */
function refreshAfterFailure(queryClient: QueryClient, error: unknown) {
  if (error instanceof ApiError && (error.status === 404 || error.status === 409)) {
    void queryClient.invalidateQueries({ queryKey: trashKeys.all })
    // A destination that vanished is also gone from the tree the picker shows.
    void queryClient.invalidateQueries({ queryKey: treeKeys.tree })
  }
}

export interface RestoreVars {
  batchId: string
  /** Omitted: back to the original parent. */
  destination?: RestoreDestination
}

/** `POST /trash/{batch_id}/restore` (no `If-Match`, never retried). */
export function useRestoreTrash() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ batchId, destination }: RestoreVars) =>
      unwrap(
        api.POST('/api/v1/trash/{batch_id}/restore', {
          params: { path: { batch_id: batchId } },
          body: destination ? { destination } : undefined,
        }),
      ),
    onSuccess: () => invalidateWorkspace(queryClient),
    onError: (error) => refreshAfterFailure(queryClient, error),
  })
}

/** `DELETE /trash/{batch_id}`: permanent. */
export function usePurgeTrash() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (batchId: string) => {
      await api.DELETE('/api/v1/trash/{batch_id}', { params: { path: { batch_id: batchId } } })
    },
    onSuccess: () => invalidateWorkspace(queryClient),
    onError: (error) => refreshAfterFailure(queryClient, error),
  })
}
