import { useState } from 'react'
import { Button, Dialog } from '../../components/ui'
import type { TreeIndex, TreeNode } from './api'
import { DestinationPicker } from './DestinationPicker'
import { FormError } from './FormError'
import { flattenFolders, parentIdOf } from './order'
import { useAction } from './useAction'

const ROOT = 'root'

interface Destination {
  /** Folder id, or `null` for the top level. */
  id: string | null
  name: string
  depth: number
  /** Why it can't be chosen. Undefined = valid. */
  reason?: string
}

/** Every possible destination in tree order; invalid ones carry the reason (UI_SPEC §5). */
export function destinationsFor(node: TreeNode, index: TreeIndex): Destination[] {
  const currentParent = parentIdOf(node)
  const alreadyHere = 'It is already here.'
  const out: Destination[] = [
    {
      id: null,
      name: 'Top level',
      depth: 0,
      reason: currentParent === null ? alreadyHere : undefined,
    },
  ]
  for (const { folder, depth } of flattenFolders(index)) {
    let reason: string | undefined
    if (node.kind === 'folder' && folder.id === node.id) {
      reason = 'A folder can’t be moved into itself.'
    } else if (
      node.kind === 'folder' &&
      index.ancestorsOf(folder.id).some((a) => a.id === node.id)
    ) {
      reason = 'A folder can’t be moved into one of its own subfolders.'
    } else if (folder.id === currentParent) {
      reason = alreadyHere
    }
    out.push({ id: folder.id, name: folder.name, depth: depth + 1, reason })
  }
  return out
}

export interface MoveDialogProps {
  node: TreeNode
  index: TreeIndex
  onSubmit: (destinationId: string | null) => Promise<unknown>
  onClose: () => void
  onReload: () => Promise<unknown>
}

/** Move picker: the folder tree as radio options, invalid destinations disabled with a reason. */
export function MoveDialog({ node, index, onSubmit, onClose, onReload }: MoveDialogProps) {
  const noun = node.kind
  const name = node.kind === 'folder' ? node.folder.name : node.list.name
  const [chosen, setChosen] = useState<string | null | undefined>(undefined)
  const { error, pending, run, clearError } = useAction(noun)
  const destinations = destinationsFor(node, index)

  // The choice may have become invalid after a refresh (e.g. its folder was trashed elsewhere).
  const choice = destinations.find((d) => d.id === chosen && !d.reason)

  const submit = async () => {
    if (!choice) return
    if (await run(() => onSubmit(choice.id))) onClose()
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Move “${name}”`}
      description="Choose where to put it. It goes to the end of that folder."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} pending={pending} disabled={!choice}>
            Move
          </Button>
        </>
      }
    >
      <DestinationPicker
        options={destinations.map((d) => ({ ...d, key: d.id ?? ROOT }))}
        value={choice ? (choice.id ?? ROOT) : undefined}
        onChange={(key) => setChosen(key === ROOT ? null : key)}
      />
      {error && (
        <FormError
          error={error}
          pending={pending}
          onReload={() => void onReload().then(clearError)}
          onRetry={() => void submit()}
        />
      )}
    </Dialog>
  )
}
