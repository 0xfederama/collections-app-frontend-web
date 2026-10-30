import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { ApiError, api, unwrap } from '../../lib/api'
import { invalidateContent } from '../../data/invalidate'
import { trashKeys, treeKeys } from '../../data/keys'

type PathSegment = components['schemas']['PathSegment']
/**
 * A Trash entry with `former_path` always an array: the API sends `null` for an entry with no
 * recorded path (a Go nil slice), read here as `[]`. `useTrash` normalizes it once.
 */
export type TrashEntry = Omit<components['schemas']['TrashEntry'], 'former_path'> & {
  former_path: PathSegment[]
}
export type RestoreResult = components['schemas']['RestoreResult']
/** `folder_id` (`null` = top level) for a folder or list root, `list_id` for an item root. */
export type RestoreDestination = { folder_id: string | null } | { list_id: string }

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
    queryFn: async ({ signal, pageParam }) => {
      const page = await unwrap(
        api.GET('/api/v1/trash', {
          params: { query: { limit: TRASH_PAGE_SIZE, offset: pageParam } },
          signal,
        }),
      )
      return {
        page: page.page,
        data: (page.data ?? []).map((entry) => ({
          ...entry,
          former_path: entry.former_path ?? [],
        })),
      }
    },
    staleTime: 0,
    refetchOnMount: 'always',
    getNextPageParam: (last) => {
      const next = last.page.offset + last.data.length
      return last.data.length > 0 && next < last.page.total ? next : undefined
    },
  })
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
    onSuccess: () => invalidateContent(queryClient),
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
    onSuccess: () => invalidateContent(queryClient),
    onError: (error) => refreshAfterFailure(queryClient, error),
  })
}

/** `DELETE /trash`: permanently removes every batch and its files in one request. */
export function useEmptyTrash() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.DELETE('/api/v1/trash')
    },
    onSuccess: () => invalidateContent(queryClient),
  })
}
