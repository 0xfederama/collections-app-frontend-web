import { useNavigate } from 'react-router'
import { useToast } from '../../components/ui'
import type { RestoreDestination, RestoreResult, TrashEntry } from './api'
import { formerParent } from './model'

/** Where a restored list or item opens. Folders have no page of their own. */
function restoredHref(
  entry: TrashEntry,
  result: RestoreResult,
  destination?: RestoreDestination,
): string | undefined {
  if (result.root_type === 'list') return `/lists/${result.root_id}`
  if (result.root_type === 'item') {
    const parent = formerParent(entry)
    const listId =
      destination && 'list_id' in destination
        ? destination.list_id
        : parent?.type === 'list'
          ? parent.id
          : undefined
    return listId ? `/lists/${listId}/items/${result.root_id}` : undefined
  }
  return undefined
}

/** The success toast after a restore, with an "Open" action for lists and items. */
export function useRestoreFeedback() {
  const toast = useToast()
  const navigate = useNavigate()
  return (
    entry: TrashEntry,
    result: RestoreResult,
    destination?: RestoreDestination,
    description?: string,
  ) => {
    const href = restoredHref(entry, result, destination)
    toast({
      kind: 'success',
      title: `Restored “${entry.root_name}”`,
      description,
      action: href ? { label: 'Open', onAction: () => void navigate(href) } : undefined,
    })
  }
}
