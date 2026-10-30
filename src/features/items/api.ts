import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { api, ifMatch, unwrap } from '../../lib/api'
import { invalidateContent, invalidateItemWrite } from '../../data/invalidate'
import { itemKeys } from '../../data/keys'

/**
 * An item. The server sends `price: null` when the item has no price, but the generated contract
 * types `price` as present (FLAG: backend contract gap), so the web type makes it nullable.
 */
export type Item = Omit<components['schemas']['Item'], 'price'> & {
  price: components['schemas']['Price'] | null
}
/** The list's type key, `null` when the list has no type (the contract types it as a plain string). */
export type ItemType = string | null
export type ItemContent = components['schemas']['Content']
export type UpdateItemRequest = components['schemas']['UpdateItemRequest']
/**
 * The create body. The contract only requires `title` (`lookup` defaults to true on the server), but
 * the generator marks a defaulted field as required, so `lookup` is made optional here: omitting it
 * is the best-effort lookup for books (an explicit `lookup: true` is mandatory and can 503).
 */
export type CreateItemRequest = Omit<components['schemas']['CreateItemRequest'], 'lookup'> & {
  lookup?: boolean
}

/**
 * The item versions this browser's own successful writes produced, per client: `produced -> from`
 * (the `If-Match` version it replaced). An open field editor holds a snapshot of the item and may
 * move it forward only along such a chain, so a change by someone else still ends in a 412.
 */
const ownWrites = new WeakMap<QueryClient, Map<string, number>>()

export function recordOwnWrite(
  client: QueryClient,
  itemId: string,
  from: number,
  produced: number,
) {
  let writes = ownWrites.get(client)
  if (!writes) ownWrites.set(client, (writes = new Map()))
  writes.set(`${itemId}:${produced}`, from)
}

/** True when every step from version `from` to version `to` was written by this client. */
export function isOwnWriteChain(client: QueryClient, itemId: string, from: number, to: number) {
  const writes = ownWrites.get(client)
  let at = to
  while (writes && at > from) {
    const before = writes.get(`${itemId}:${at}`)
    if (before === undefined) return false
    at = before
  }
  return at === from
}

/** `GET /items/{id}`: the full item, with `metadata` shaped by `type` and the `path` of its list. */
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
    recordOwnWrite(client, item.id, item.version, moved.version)
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
      recordOwnWrite(client, item.id, item.version, updated.version)
      client.setQueryData<Item>(itemKeys.detail(item.id), updated)
      return updated
    },
    // A new title or status shows in the list, the tree, search results and Home "Recently updated".
    (queryClient, { item }) => void invalidateItemWrite(queryClient, item.list_id),
  )
}

/** `POST /lists/{id}/items`: the new item is cached so its page opens without a loading state. */
export function useCreateItem(listId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateItemRequest) =>
      unwrap(
        api.POST('/api/v1/lists/{id}/items', {
          params: { path: { id: listId } },
          body: body as components['schemas']['CreateItemRequest'],
        }),
      ),
    onSuccess: (created) => {
      client.setQueryData<Item>(itemKeys.detail(created.id), created)
      void invalidateContent(client)
    },
  })
}
