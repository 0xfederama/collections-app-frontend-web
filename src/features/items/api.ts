import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { api, ifMatch, unwrap } from '../../lib/api'
import { invalidateContent } from '../invalidateContent'
import { listKeys } from '../lists/api'
import { treeKeys } from '../tree/api'

export type Item = components['schemas']['Item']
export type ItemKind = components['schemas']['ItemKind']
export type ItemContent = components['schemas']['Content']
export type UpdateItemRequest = components['schemas']['UpdateItemRequest']
export type CreateItemRequest = components['schemas']['CreateItemRequest']

/** Exported so other features (W-08, W-09, W-10) invalidate by key, not by string literal. */
export const itemKeys = {
  detail: (itemId: string) => ['items', itemId, 'detail'] as const,
  content: (itemId: string) => ['items', itemId, 'content'] as const,
}

/** `GET /items/{id}`: the full item, with `metadata` shaped by `kind` and the `path` of its list. */
export function useItem(itemId: string) {
  return useQuery({
    queryKey: itemKeys.detail(itemId),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/items/{id}', { params: { path: { id: itemId } }, signal })),
  })
}

/** `GET /items/{id}/content`: the Markdown description (version 0 and an empty body when never saved). */
export function useItemContent(itemId: string) {
  return useQuery({
    queryKey: itemKeys.content(itemId),
    queryFn: ({ signal }) =>
      unwrap(api.GET('/api/v1/items/{id}/content', { params: { path: { id: itemId } }, signal })),
  })
}

/**
 * Writes on one item. `If-Match` comes from the version of the item the user was looking at and a
 * 412 is never retried (mutation defaults). Deleting or moving changes what the list shows and the
 * item counts of the tree, so everything is invalidated (`invalidateContent`); `PATCH` passes a
 * narrower `onDone` because its answer already replaced the cached detail.
 */
function useItemMutation<TVars extends { item: Item }, TData>(
  mutationFn: (vars: TVars) => Promise<TData>,
  onDone: (client: QueryClient, vars: TVars) => void = (client) => void invalidateContent(client),
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (_data, vars) => onDone(client, vars),
  })
}

/** `DELETE /items/{id}`: soft delete, the item goes to Trash. */
export function useDeleteItem() {
  const client = useQueryClient()
  return useItemMutation(async ({ item }: { item: Item }) => {
    await api.DELETE('/api/v1/items/{id}', {
      params: { path: { id: item.id }, header: ifMatch('item', item.version) },
    })
    // Before the shared invalidation, so the open page doesn't refetch a deleted item (404).
    client.removeQueries({ queryKey: itemKeys.detail(item.id) })
    client.removeQueries({ queryKey: itemKeys.content(item.id) })
  })
}

/** `POST /items/{id}/move`: appends the item to the end of another list. */
export function useMoveItem() {
  const client = useQueryClient()
  return useItemMutation(async ({ item, listId }: { item: Item; listId: string }) => {
    const moved = await unwrap(
      api.POST('/api/v1/items/{id}/move', {
        params: { path: { id: item.id }, header: ifMatch('item', item.version) },
        body: { list_id: listId },
      }),
    )
    client.setQueryData<Item>(itemKeys.detail(item.id), moved)
    return moved
  })
}

/**
 * `PATCH /items/{id}`: `If-Match` comes from the version of the item the form was opened on, never
 * from a refetch, and a 412 is not retried (UI_SPEC §9). The answer replaces the cached detail.
 */
export function useUpdateItem() {
  const client = useQueryClient()
  return useItemMutation(
    async ({ item, patch }: { item: Item; patch: UpdateItemRequest }) => {
      const updated = await unwrap(
        api.PATCH('/api/v1/items/{id}', {
          params: { path: { id: item.id }, header: ifMatch('item', item.version) },
          body: patch,
        }),
      )
      client.setQueryData<Item>(itemKeys.detail(item.id), updated)
      return updated
    },
    (queryClient, { item }) => {
      void queryClient.invalidateQueries({ queryKey: listKeys.items(item.list_id) })
      void queryClient.invalidateQueries({ queryKey: listKeys.detail(item.list_id) })
      void queryClient.invalidateQueries({ queryKey: treeKeys.tree })
    },
  )
}

/** `POST /lists/{id}/items`: the new item is cached so its page opens without a loading state. */
export function useCreateItem(listId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateItemRequest) =>
      unwrap(api.POST('/api/v1/lists/{id}/items', { params: { path: { id: listId } }, body })),
    onSuccess: (created) => {
      client.setQueryData<Item>(itemKeys.detail(created.id), created)
      void invalidateContent(client)
    },
  })
}
