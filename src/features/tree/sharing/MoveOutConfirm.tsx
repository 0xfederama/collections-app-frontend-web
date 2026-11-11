import { AlertDialog } from '../../../components/ui'
import { useMe, useUsers } from '../../account'
import type { Folder } from '../api'
import { peopleWithAccess } from './people'

/** "Alice", "Alice and Bob", "Alice, Bob and Carol". */
function joinLabels(labels: readonly string[]): string {
  if (labels.length <= 1) return labels[0] ?? ''
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`
}

/** Asks before a move takes something out of a shared folder: it becomes the mover's, the others lose it. */
export function MoveOutConfirm({
  name,
  box,
  onConfirm,
  onCancel,
}: {
  /** What is being moved. */
  name: string
  /** The shared folder it leaves. */
  box: Folder
  onConfirm: () => void
  onCancel: () => void
}) {
  const meId = useMe().data?.id
  const users = useUsers().data
  const others = peopleWithAccess(box, users).filter((p) => p.id !== meId)
  const who = others.length > 0 ? joinLabels(others.map((p) => p.label)) : 'The other people'
  return (
    <AlertDialog
      open
      onOpenChange={(open) => !open && onCancel()}
      title={`Move ‘${name}’ out of ‘${box.name}’?`}
      description={`It becomes yours. ${who} will no longer see it.`}
      confirmLabel="Move"
      onConfirm={onConfirm}
    />
  )
}
