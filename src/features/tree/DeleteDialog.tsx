import { AlertDialog } from '../../components/ui'
import { FormError } from './FormError'
import { useAction } from './useAction'

export interface DeleteDialogProps {
  noun: 'folder' | 'list'
  name: string
  /** What goes to Trash, root included, worded like the Trash entry: "1 folder, 3 lists, 12 items". */
  contents: string
  /** A shared folder the user owns: the members lose it too (F-027). */
  shared?: boolean
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
  shared,
  onConfirm,
  onClose,
  onReload,
}: DeleteDialogProps) {
  const { error, pending, run, clearError } = useAction(noun, name)

  const confirm = async () => {
    if (await run(onConfirm)) onClose()
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Delete “${name}”?`}
      description={`This moves “${name}” to Trash: ${contents}. You can restore it from there.${shared ? ' The people it’s shared with lose it too.' : ''}`}
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
