import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { AlertDialog, Select } from '../../../components/ui'
import { NO_TYPE_VALUE, typeOptions, valueToType } from '../../items'
import { treeKeys } from '../../../data/keys'
import { useUpdateList, type List } from '../../tree'
import type { TypeDefinition } from '../api'

export function ChangeListsDialog({
  type,
  lists,
  targetTypes,
  onCancel,
  onDone,
  run,
}: {
  type: TypeDefinition
  lists: List[]
  targetTypes: TypeDefinition[]
  onCancel: () => void
  onDone: () => void
  run: (operation: () => Promise<unknown>) => Promise<void>
}) {
  const queryClient = useQueryClient()
  const updateList = useUpdateList()
  // Preselects the first other type, as the Delete button did before this dialog owned the choice.
  const [changeTargetType, setChangeTargetType] = useState(
    () => targetTypes.find((target) => target.key !== type.key)?.key ?? NO_TYPE_VALUE,
  )

  return (
    <AlertDialog
      open
      title={`Change lists from ${type.name}?`}
      description="Changing a list's type permanently clears the old type's custom fields and price from all its items, including trashed items. Titles, images, descriptions and history stay. There is no undo."
      confirmLabel="Change listed types"
      destructive
      keepOpen
      pending={updateList.isPending}
      onOpenChange={(open) => !open && !updateList.isPending && onCancel()}
      onConfirm={() =>
        void run(async () => {
          if (!changeTargetType) return
          const latestLists = lists.filter((list) => list.type === type.key)
          if (latestLists.length === 0) {
            onDone()
            return
          }
          for (const list of latestLists) {
            await updateList.mutateAsync({
              list,
              patch: { type: valueToType(changeTargetType) },
            })
          }
          await queryClient.refetchQueries({ queryKey: treeKeys.tree, type: 'active' })
          onDone()
        })
      }
    >
      <Select
        label="Change listed lists to"
        options={typeOptions(targetTypes)}
        value={changeTargetType}
        onValueChange={setChangeTargetType}
        disabled={updateList.isPending}
      />
      <p className="text-sm text-text-muted">
        Lists:{' '}
        {lists
          .filter((list) => list.type === type.key)
          .map((list) => list.name)
          .join(', ') || 'None'}
      </p>
    </AlertDialog>
  )
}
