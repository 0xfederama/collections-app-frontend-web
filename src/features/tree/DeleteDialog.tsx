import { AlertDialog } from '../../components/ui'
import { FormError } from './FormError'
import { useAction } from './useAction'

export interface DeleteDialogProps {
  noun: 'folder' | 'list'
  name: string
  /** What goes to Trash with it, e.g. "3 lists and 12 items". Empty when nothing else does. */
  contents: string
  onConfirm: () => Promise<unknown>
  onClose: () => void
  /** Refetches the tree so the next confirm uses the current version. */
  onReload: () => Promise<unknown>
}

/** Confirmation to move a folder or list to Trash. Stays open and shows the error if it fails. */
export function DeleteDialog({
  noun,
  name,
  contents,
  onConfirm,
  onClose,
  onReload,
}: DeleteDialogProps) {
  const { error, pending, run, clearError } = useAction(noun)

  const confirm = async () => {
    if (await run(onConfirm)) onClose()
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Delete “${name}”?`}
      description={
        contents
          ? `“${name}” and everything in it (${contents}) will move to Trash. You can restore it from there.`
          : `“${name}” will move to Trash. You can restore it from there.`
      }
      confirmLabel="Move to Trash"
      destructive
      keepOpen
      pending={pending}
      onConfirm={() => void confirm()}
    >
      {error && (
        <FormError
          error={error}
          pending={pending}
          onReload={() => void onReload().then(clearError)}
          onRetry={() => void confirm()}
        />
      )}
    </AlertDialog>
  )
}
