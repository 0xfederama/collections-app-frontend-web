import { AlertDialog } from '../../components/ui'

/** Confirms leaving the settings page with unsaved changes (the router blocker, see useLeaveGuard). */
export function DiscardChangesDialog({
  onKeepEditing,
  onDiscard,
}: {
  onKeepEditing: () => void
  onDiscard: () => void
}) {
  return (
    <AlertDialog
      open
      title="Discard changes?"
      description="You have unsaved settings. If you leave now, they are lost."
      confirmLabel="Discard changes"
      cancelLabel="Keep editing"
      destructive
      keepOpen
      onOpenChange={(open) => !open && onKeepEditing()}
      onConfirm={onDiscard}
    />
  )
}
