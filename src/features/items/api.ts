import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { api, ifMatch, unwrap } from '../../lib/api'
import { listKeys } from '../lists/api'
import { treeKeys } from '../tree/api'

export type Item = components['schemas']['Item']
export type ItemKind = components['schemas']['ItemKind']
export type ItemContent = components['schemas']['Content']

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
 * item counts of the tree, so both are invalidated.
 */
function useItemMutation<TVars extends { item: Item }, TData>(
  mutationFn: (vars: TVars) => Promise<TData>,
  extraLists: (vars: TVars, data: TData) => string[] = () => [],
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (data, vars) => {
      for (const listId of new Set([vars.item.list_id, ...extraLists(vars, data)])) {
        void client.invalidateQueries({ queryKey: listKeys.items(listId) })
        // `item_count` of the list header.
        void client.invalidateQueries({ queryKey: listKeys.detail(listId) })
      }
      void client.invalidateQueries({ queryKey: treeKeys.tree })
    },
  })
}

/** `DELETE /items/{id}`: soft delete, the item goes to Trash. */
export function useDeleteItem() {
  const client = useQueryClient()
  const mutation = useItemMutation(async ({ item }: { item: Item }) => {
    await api.DELETE('/api/v1/items/{id}', {
      params: { path: { id: item.id }, header: ifMatch('item', item.version) },
    })
  })
  return {
    ...mutation,
    mutateAsync: async (vars: { item: Item }) => {
      await mutation.mutateAsync(vars)
      client.removeQueries({ queryKey: itemKeys.detail(vars.item.id) })
      client.removeQueries({ queryKey: itemKeys.content(vars.item.id) })
    },
  }
}

/** `POST /items/{id}/move`: appends the item to the end of another list. */
export function useMoveItem() {
  const client = useQueryClient()
  return useItemMutation(
    async ({ item, listId }: { item: Item; listId: string }) => {
      const moved = await unwrap(
        api.POST('/api/v1/items/{id}/move', {
          params: { path: { id: item.id }, header: ifMatch('item', item.version) },
          body: { list_id: listId },
        }),
      )
      client.setQueryData<Item>(itemKeys.detail(item.id), moved)
      return moved
    },
    (_vars, moved) => [moved.list_id],
  )
}
