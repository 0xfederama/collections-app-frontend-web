import { useState } from 'react'
import { Button, Dialog, Tooltip } from '../../components/ui'
import { cx } from '../../lib/cx'
import type { TreeIndex, TreeNode } from './api'
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
      <div
        role="radiogroup"
        aria-label="Destination"
        className="flex max-h-72 flex-col gap-0.5 overflow-y-auto rounded-md border border-border p-1"
      >
        {destinations.map((d) => {
          const key = d.id ?? ROOT
          const reasonId = `move-reason-${key}`
          const row = (
            <label
              className={cx(
                'flex min-h-9 items-center gap-2 rounded-sm pr-2 text-sm pointer-coarse:min-h-11',
                d.reason ? 'cursor-not-allowed text-text-muted' : 'cursor-pointer hover:bg-border',
                choice?.id === d.id && 'bg-border font-medium',
              )}
              style={{ paddingInlineStart: `${d.depth * 16 + 8}px` }}
            >
              <input
                type="radio"
                name="move-destination"
                className="size-4 accent-[var(--accent)]"
                checked={choice?.id === d.id}
                disabled={!!d.reason}
                aria-describedby={d.reason ? reasonId : undefined}
                onChange={() => setChosen(d.id)}
              />
              <span className="min-w-0 flex-1 truncate">{d.name}</span>
              {d.reason && (
                <span id={reasonId} className="text-xs">
                  {d.reason}
                </span>
              )}
            </label>
          )
          // The reason is always visible (and read out); the tooltip repeats it for hover.
          return <div key={key}>{d.reason ? <Tooltip content={d.reason}>{row}</Tooltip> : row}</div>
        })}
      </div>
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
