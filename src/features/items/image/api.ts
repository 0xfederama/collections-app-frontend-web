import { useQueryClient } from '@tanstack/react-query'
import { api, ifMatch, unwrap } from '../../../lib/api'
import { listKeys } from '../../lists/api'
import { itemKeys, type Item } from '../api'
import { putImageFile } from './upload'

/**
 * The three image writes of an item (API §4). Each is its own request with `If-Match` from the
 * version of the item as it is now, is never retried on 412, and returns the updated item.
 * On success the detail cache gets the answer and the list (which shows thumbnails) is refetched.
 */
export function useItemImage(item: Item) {
  const client = useQueryClient()
  const commit = (updated: Item) => {
    client.setQueryData<Item>(itemKeys.detail(item.id), updated)
    void client.invalidateQueries({ queryKey: listKeys.items(updated.list_id) })
    void client.invalidateQueries({ queryKey: listKeys.detail(updated.list_id) })
    return updated
  }
  const params = { path: { id: item.id }, header: ifMatch('item', item.version) }
  return {
    upload: async (
      file: File,
      options: { onProgress?: (fraction: number) => void; signal?: AbortSignal },
    ) => commit(await putImageFile({ itemId: item.id, version: item.version, file, ...options })),
    setUrl: async (url: string) =>
      commit(
        await unwrap(api.PUT('/api/v1/items/{id}/image', { params, body: { url: url.trim() } })),
      ),
    remove: async () => commit(await unwrap(api.DELETE('/api/v1/items/{id}/image', { params }))),
  }
}
