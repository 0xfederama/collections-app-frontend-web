import type { QueryClient } from '@tanstack/react-query'
import {
  homeKeys,
  ITEMS_KEY_ROOT,
  LISTS_KEY_ROOT,
  listKeys,
  searchKeys,
  trashKeys,
  treeKeys,
} from './keys'

/**
 * The one invalidation for any write that changes WHAT EXISTS or WHERE it is (create, trash,
 * restore, purge, move; F006-W1). Every screen that shows content refetches: sidebar tree, list
 * views and headers, item details, search, Home "Recently updated" and the Trash list. Keep it in
 * one place so a new screen only has to be added here.
 */
export function invalidateContent(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: treeKeys.tree }),
    queryClient.invalidateQueries({ queryKey: [LISTS_KEY_ROOT] }),
    queryClient.invalidateQueries({ queryKey: [ITEMS_KEY_ROOT] }),
    queryClient.invalidateQueries({ queryKey: searchKeys.all }),
    queryClient.invalidateQueries({ queryKey: homeKeys.recent }),
    queryClient.invalidateQueries({ queryKey: trashKeys.all }),
  ])
}

/**
 * A write on one item that changes its title or status but not where it is (`PATCH`): its list,
 * the tree counts, search results and Home "Recently updated". The trash and the other lists are
 * left alone (a broad `['items']` refetch would overwrite the PATCH answer, see `useUpdateItem`).
 */
export function invalidateItemWrite(queryClient: QueryClient, listId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: listKeys.items(listId) }),
    queryClient.invalidateQueries({ queryKey: listKeys.detail(listId) }),
    queryClient.invalidateQueries({ queryKey: treeKeys.tree }),
    queryClient.invalidateQueries({ queryKey: searchKeys.all }),
    queryClient.invalidateQueries({ queryKey: homeKeys.recent }),
  ])
}
