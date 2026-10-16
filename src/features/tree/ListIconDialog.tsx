import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Dialog } from '../../components/ui'
import type { IconChoice } from '../lists/iconModel'
import { ListIconPicker } from '../lists/ListIconPicker'
import { useUpdateListIcon } from './mutations'
import type { List } from './api'
import { treeKeys, type TreeData } from './api'
import { FormError } from './FormError'
import { useAction } from './useAction'

export function ListIconDialog({
  list: initialList,
  onClose,
}: {
  list: List
  onClose: () => void
}) {
  const [snapshot, setSnapshot] = useState(initialList)
  const [choice, setChoice] = useState<IconChoice>({
    icon: initialList.icon,
    icon_color: initialList.icon_color,
  })
  const [pickerOpen, setPickerOpen] = useState(false)
  const update = useUpdateListIcon()
  const queryClient = useQueryClient()
  const action = useAction('list')

  const reload = async () => {
    await queryClient.refetchQueries({ queryKey: treeKeys.tree })
    const data = queryClient.getQueryData<TreeData>(treeKeys.tree)
    const latest = data?.lists.find((entry) => entry.id === snapshot.id)
    if (!latest) {
      action.setError({
        kind: 'not_found',
        message: 'This list no longer exists. The lists were refreshed.',
        fieldErrors: [],
      })
      return
    }
    setSnapshot(latest)
    action.clearError()
  }

  const save = async () => {
    if (await action.run(() => update.mutateAsync({ list: snapshot, icon: choice }))) onClose()
  }

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => !open && onClose()}
        title={`List icon · ${snapshot.name}`}
        description="Choose the mark shown beside this list throughout the app."
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button pending={action.pending} onClick={() => void save()}>
              Save
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setPickerOpen(true)}>
              Choose icon
            </Button>
            <span className="text-sm text-text-muted">{choice.icon ?? 'Use the default icon'}</span>
          </div>
          {action.error && (
            <FormError
              error={action.error}
              pending={action.pending}
              onReload={
                action.error.kind === 'conflict' || action.error.kind === 'not_found'
                  ? () => void reload()
                  : undefined
              }
              onRetry={action.error.kind === 'network' ? () => void save() : undefined}
            />
          )}
        </div>
      </Dialog>
      {pickerOpen && (
        <ListIconPicker
          value={choice}
          kind={snapshot.kind}
          onChange={setChoice}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}
