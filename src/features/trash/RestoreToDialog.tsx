import { useState } from 'react'
import { Button, Dialog, Skeleton } from '../../components/ui'
import {
  type TreeIndex,
  type TreeNode,
  useTreeIndex,
  DestinationPicker,
  type DestinationOption,
  flattenFolders,
} from '../tree'
import {
  useRestoreTrash,
  type RestoreDestination,
  type RestoreResult,
  type TrashEntry,
} from './api'
import { classifyTrashError, type TrashError } from './errors'
import { TrashErrorMessage } from './TrashError'

const ROOT = 'root'

/**
 * Folder and list roots go to a folder (or the top level); an item goes to a list, shown under
 * the folders that hold it (folders are labels there, not choices).
 */
function destinationOptions(entry: TrashEntry, index: TreeIndex): DestinationOption[] {
  if (entry.root_type === 'item') {
    const out: DestinationOption[] = []
    const visit = (nodes: readonly TreeNode[], depth: number) => {
      for (const node of nodes) {
        if (node.kind === 'folder') {
          out.push({ key: `folder-${node.id}`, name: node.folder.name, depth, group: true })
          visit(node.children, depth + 1)
        } else {
          out.push({ key: node.id, name: node.list.name, depth })
        }
      }
    }
    visit(index.nodes, 0)
    return out
  }
  return [
    { key: ROOT, name: 'Top level', depth: 0 },
    ...flattenFolders(index).map(({ folder, depth }) => ({
      key: folder.id,
      name: folder.name,
      depth: depth + 1,
    })),
  ]
}

const toDestination = (entry: TrashEntry, key: string): RestoreDestination =>
  entry.root_type === 'item' ? { list_id: key } : { folder_id: key === ROOT ? null : key }

export interface RestoreToDialogProps {
  entry: TrashEntry
  onClose: () => void
  onRestored: (result: RestoreResult, destination: RestoreDestination) => void
  /** 404: the entry is already gone; report it and close. */
  onGone: () => void
}

/** "Restore to…": pick an active destination. A 409 keeps the dialog open with the reason. */
export function RestoreToDialog({ entry, onClose, onRestored, onGone }: RestoreToDialogProps) {
  const tree = useTreeIndex()
  const restore = useRestoreTrash()
  const [chosen, setChosen] = useState<string | undefined>()
  const [rejected, setRejected] = useState<ReadonlyMap<string, string>>(new Map())
  const [error, setError] = useState<TrashError | null>(null)

  const isItem = entry.root_type === 'item'
  const options =
    tree.status === 'success'
      ? destinationOptions(entry, tree.index).map((option) => ({
          ...option,
          reason: rejected.get(option.key),
        }))
      : []
  // The choice may have vanished after the tree refreshed (e.g. its folder was trashed elsewhere).
  const choice = options.find((o) => o.key === chosen && !o.group && !o.reason)

  const submit = async () => {
    if (!choice) return
    setError(null)
    const destination = toDestination(entry, choice.key)
    try {
      const result = await restore.mutateAsync({ batchId: entry.id, destination })
      onRestored(result, destination)
    } catch (caught) {
      const classified = classifyTrashError(caught)
      if (classified.kind === 'gone') return onGone()
      if (classified.kind === 'cycle') {
        setRejected(new Map(rejected).set(choice.key, classified.message))
      }
      if (classified.kind === 'cycle' || classified.kind === 'unavailable') setChosen(undefined)
      setError(classified)
    }
  }

  let body
  if (tree.status === 'pending') {
    body = (
      <div role="status" className="flex flex-col gap-2">
        <span className="sr-only">Loading destinations</span>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    )
  } else if (tree.status === 'error') {
    body = (
      <div
        role="alert"
        className="flex flex-col items-start gap-2 rounded-lg border border-danger-border bg-danger-bg p-3 text-ui text-danger-text"
      >
        <p>The destinations could not be loaded.</p>
        <Button size="sm" variant="secondary" onClick={tree.refetch}>
          Retry
        </Button>
      </div>
    )
  } else if (isItem && !options.some((o) => !o.group)) {
    body = (
      <p className="text-ui text-text-muted">
        There are no lists to restore it to. Create a list first, then restore the item.
      </p>
    )
  } else {
    body = (
      <DestinationPicker
        options={options}
        value={choice?.key}
        onChange={setChosen}
        label="Destination"
      />
    )
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`Restore “${entry.root_name}” to…`}
      description={
        isItem
          ? 'Choose the list to put it in. It goes to the end of that list.'
          : 'Choose where to put it. It goes to the end of that folder.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} pending={restore.isPending} disabled={!choice}>
            Restore
          </Button>
        </>
      }
    >
      {body}
      {error && (
        <TrashErrorMessage
          error={error}
          pending={restore.isPending}
          onRetry={() => void submit()}
        />
      )}
    </Dialog>
  )
}
