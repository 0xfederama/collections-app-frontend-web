import { useState } from 'react'
import { AlertDialog } from '../../components/ui'
import { useEmptyTrash } from './api'
import { classifyTrashError, type TrashError } from './errors'
import { TrashErrorMessage } from './TrashError'

export function EmptyTrashDialog({
  entries,
  itemCount,
  onClose,
  onDone,
}: {
  entries: number
  itemCount: number
  onClose: () => void
  onDone: () => void
}) {
  const empty = useEmptyTrash()
  const [error, setError] = useState<TrashError | null>(null)

  const confirm = async () => {
    setError(null)
    try {
      await empty.mutateAsync()
      onDone()
    } catch (caught) {
      setError(classifyTrashError(caught))
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Empty trash permanently?"
      description={`This permanently deletes ${entries} trash ${entries === 1 ? 'entry' : 'entries'} and ${itemCount} ${itemCount === 1 ? 'item' : 'items'}, including items inside trashed folders and lists, and removes their image files. This can’t be undone.`}
      confirmLabel="Empty trash"
      destructive
      keepOpen
      pending={empty.isPending}
      onConfirm={() => void confirm()}
    >
      {error && (
        <TrashErrorMessage error={error} pending={empty.isPending} onRetry={() => void confirm()} />
      )}
    </AlertDialog>
  )
}
