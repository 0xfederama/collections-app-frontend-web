import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ifMatch, unwrap } from '../../../lib/api'
import { contentKeys, itemKeys, listKeys } from '../../../data/keys'
import type { ItemContent } from '../api'

/**
 * A content write changes the item's `updated_at` and `content_version` but not its own `version`
 * (checked on the real backend), so the item caches are refreshed without touching the edit form's
 * snapshot, and the version list gets the new row.
 */
function useContentWrite<TVars extends { itemId: string; listId: string }>(
  mutationFn: (vars: TVars) => Promise<ItemContent>,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (saved, { itemId, listId }) => {
      client.setQueryData<ItemContent>(itemKeys.content(itemId), saved)
      void client.invalidateQueries({ queryKey: contentKeys.versions(itemId) })
      void client.invalidateQueries({ queryKey: itemKeys.detail(itemId) })
      void client.invalidateQueries({ queryKey: listKeys.items(listId) })
    },
  })
}

/** `PUT /items/{id}/content`: `If-Match` is the version the editor was opened on, never retried. */
export function useSaveContent() {
  return useContentWrite(
    ({
      itemId,
      version,
      body,
    }: {
      itemId: string
      listId: string
      version: number
      body: string
    }) =>
      unwrap(
        api.PUT('/api/v1/items/{id}/content', {
          params: { path: { id: itemId }, header: ifMatch('content', version) },
          body: { body },
        }),
      ),
  )
}

/** `POST /items/{id}/content/restore`: `version` is the old one to copy, `current` goes in `If-Match`. */
export function useRestoreContent() {
  return useContentWrite(
    ({
      itemId,
      current,
      version,
    }: {
      itemId: string
      listId: string
      current: number
      version: number
    }) =>
      unwrap(
        api.POST('/api/v1/items/{id}/content/restore', {
          params: { path: { id: itemId }, header: ifMatch('content', current) },
          body: { version },
        }),
      ),
  )
}

/** `GET …/content/versions`: newest first, at most 201. */
export function useContentVersions(itemId: string, enabled = true) {
  return useQuery({
    queryKey: contentKeys.versions(itemId),
    enabled,
    staleTime: 0,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/items/{id}/content/versions', {
          params: { path: { id: itemId } },
          signal,
        }),
      ).then((list) => list.data),
  })
}

/** `GET …/content/versions/{version}`: 404 when the version was pruned. */
export function useContentVersion(itemId: string, version: number | null) {
  return useQuery({
    queryKey: contentKeys.version(itemId, version ?? -1),
    enabled: version !== null,
    retry: false,
    queryFn: ({ signal }) =>
      unwrap(
        api.GET('/api/v1/items/{id}/content/versions/{version}', {
          params: { path: { id: itemId, version: version ?? 0 } },
          signal,
        }),
      ),
  })
}
