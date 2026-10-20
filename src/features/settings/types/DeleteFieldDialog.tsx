import { AlertDialog } from '../../../components/ui'
import { useDeleteTypeField, type TypeDefinition, type TypeField } from '../api'

export function DeleteFieldDialog({
  target,
  onClose,
  run,
}: {
  target: { type: TypeDefinition; field: TypeField; count: number }
  onClose: () => void
  run: (operation: () => Promise<unknown>) => Promise<void>
}) {
  const deleteField = useDeleteTypeField()

  return (
    <AlertDialog
      open
      title={`Delete ${target.field.label}?`}
      description={
        target.count === 0
          ? 'No items have a value for this field.'
          : `${target.count} ${target.count === 1 ? 'item has' : 'items have'} a value (including trashed items). Deleting the field removes those values, and any sort or pin that uses it falls back to the type defaults.`
      }
      confirmLabel="Delete field"
      destructive
      onOpenChange={(open) => !open && onClose()}
      onConfirm={() =>
        void run(async () => {
          await deleteField.mutateAsync(target)
          onClose()
        })
      }
      pending={deleteField.isPending}
    />
  )
}
