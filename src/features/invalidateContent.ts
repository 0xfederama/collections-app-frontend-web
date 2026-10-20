import type { QueryClient } from '@tanstack/react-query'
import { homeKeys } from './home/api'
import { searchKeys } from './search/api'
import { ITEMS_KEY_ROOT, LISTS_KEY_ROOT, trashKeys } from './trash/keys'
import { treeKeys } from './tree'

/**
 * The one invalidation for any write that changes WHAT EXISTS or WHERE it is (create, trash,
 * restore, purge, move; F006-W1). Every screen that shows content refetches: sidebar tree, list
 * views and headers, item details, search, Home "Recently updated" and the Trash list. Keep it in
 * one place so a new screen only has to be added here. It must not import the mutation files
 * (they import it).
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
