import { AlertDialog } from '../../../components/ui'
import type { List } from '../../tree'
import { useDeleteType, type TypeDefinition } from '../api'

export function DeleteTypeDialog({
  type,
  lists,
  treePending,
  onChangeLists,
  onClose,
  run,
  onDeleted,
}: {
  type: TypeDefinition
  lists: List[]
  treePending: boolean
  onChangeLists: () => void
  onClose: () => void
  run: (operation: () => Promise<unknown>) => Promise<void>
  onDeleted: () => void
}) {
  const deleteType = useDeleteType()
  const affectedLists = lists.filter((list) => list.type === type.key)

  return (
    <AlertDialog
      open
      title={`Delete ${type.name}?`}
      description={
        affectedLists.length
          ? `${affectedLists.length} active ${affectedLists.length === 1 ? 'list uses' : 'lists use'} this type: ${affectedLists.map((list) => list.name).join(', ')}. Change them to another type before deleting this definition.`
          : 'No active lists use this type. Deleting the definition cannot be undone.'
      }
      confirmLabel={affectedLists.length ? 'Choose target type' : 'Delete type'}
      destructive
      pending={deleteType.isPending || treePending}
      onOpenChange={(open) => !open && !deleteType.isPending && onClose()}
      onConfirm={() =>
        affectedLists.length
          ? onChangeLists()
          : void run(async () => {
              await deleteType.mutateAsync(type)
              onDeleted()
            })
      }
    />
  )
}
