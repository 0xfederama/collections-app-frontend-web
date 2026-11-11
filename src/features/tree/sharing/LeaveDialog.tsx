import { AlertDialog } from '../../../components/ui'
import type { TreeError } from '../errors'
import { FormError } from '../FormError'

/** Confirm leaving a shared folder. Stays open with the error if the call fails. */
export function LeaveDialog({
  name,
  ownerLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  name: string
  ownerLabel: string
  pending: boolean
  error: TreeError | null
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <AlertDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Leave ‘${name}’?`}
      description={`It disappears from your collection. What you added stays in it, owned by ${ownerLabel}.`}
      confirmLabel="Leave folder"
      destructive
      keepOpen
      pending={pending}
      onConfirm={onConfirm}
    >
      {error && <FormError error={error} pending={pending} onRetry={onConfirm} />}
    </AlertDialog>
  )
}
