import { useMatch } from 'react-router'
import type { BreadcrumbItem } from '../../components/ui'
import { useTreeIndex } from './api'

/**
 * Breadcrumbs for the current route, from the tree data: `Folder › Sub › List` on a list and
 * `Folder › Sub › List › Item` on an item. Folders have no page, so they are plain text.
 * Empty for every other route, and while the tree is loading or the list is unknown.
 */
export function useBreadcrumbs(): BreadcrumbItem[] {
  const listId = useMatch({ path: '/lists/:listId', end: false })?.params.listId
  const onItem = useMatch('/lists/:listId/items/:itemId') !== null
  const result = useTreeIndex()

  const list = listId && result.status === 'success' ? result.index.lists.get(listId) : undefined
  if (!list || result.status !== 'success') return []

  const trail: BreadcrumbItem[] = result.index
    .ancestorsOf(list.id)
    .map((folder) => ({ label: folder.name }))
  trail.push({ label: list.name, to: `/lists/${list.id}` })
  // The item page shows its own title as the heading, so the crumb stays generic.
  if (onItem) trail.push({ label: 'Item' })
  return trail
}
