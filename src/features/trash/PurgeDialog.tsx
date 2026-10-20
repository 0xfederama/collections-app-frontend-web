import { useState } from 'react'
import { AlertDialog } from '../../components/ui'
import { usePurgeTrash, type TrashEntry } from './api'
import { classifyTrashError, type TrashError } from './errors'
import { countsText, typeLabel } from './model'
import { TrashErrorMessage } from './TrashError'

/** PRODUCT §10: states what goes, that image files go with it, and that nested older entries do too. */
function purgeDescription(entry: TrashEntry): string {
  const name = `“${entry.root_name}”`
  if (entry.root_type === 'item') {
    return `This permanently deletes the item ${name} and its image files. This can’t be undone.`
  }
  return (
    `This permanently deletes the ${typeLabel[entry.root_type].toLowerCase()} ${name} ` +
    `(${countsText(entry.counts)}) and the image files of everything in it. ` +
    `Older entries in Trash that were inside it are deleted too. This can’t be undone.`
  )
}

export interface PurgeDialogProps {
  entry: TrashEntry
  onClose: () => void
  /** The entry is gone (purged, or already gone elsewhere): report it and close. */
  onDone: (outcome: 'purged' | 'gone') => void
}

/** Explicit confirmation for a purge. No type-to-confirm. Stays open and shows the error if it fails. */
export function PurgeDialog({ entry, onClose, onDone }: PurgeDialogProps) {
  const purge = usePurgeTrash()
  const [error, setError] = useState<TrashError | null>(null)

  const confirm = async () => {
    setError(null)
    try {
      await purge.mutateAsync(entry.id)
      onDone('purged')
    } catch (caught) {
      const classified = classifyTrashError(caught)
      if (classified.kind === 'gone') onDone('gone')
      else setError(classified)
    }
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title="Delete permanently?"
      description={purgeDescription(entry)}
      confirmLabel="Delete permanently"
      destructive
      keepOpen
      pending={purge.isPending}
      onConfirm={() => void confirm()}
    >
      {error && (
        <TrashErrorMessage error={error} pending={purge.isPending} onRetry={() => void confirm()} />
      )}
    </AlertDialog>
  )
}
