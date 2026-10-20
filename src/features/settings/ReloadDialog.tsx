import { AlertDialog } from '../../components/ui'

/** Confirms "Reload latest", which drops the draft once the latest settings are fetched. */
export function ReloadDialog({
  reloading,
  onClose,
  onConfirm,
}: {
  reloading: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog
      open
      title="Replace your unsaved changes with the latest settings?"
      description="Your draft is discarded. Use Copy my draft first if you want to keep it."
      confirmLabel="Reload latest"
      cancelLabel="Keep my draft"
      keepOpen
      pending={reloading}
      onOpenChange={(open) => !open && onClose()}
      onConfirm={onConfirm}
    />
  )
}
