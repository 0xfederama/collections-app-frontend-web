import type { TreeHit, useToast } from '../../components/ui'
import type { Folder, TreeIndex } from './api'
import { classifyError } from './errors'
import { dropSteps, projectDrop, type TreeDropResult } from './model/drop'
import type { useMoveFolder, useMoveList } from './mutations'
import { buildSortable } from './order'
import { leavesSharedBox } from './sharing/leavesBox'

/** Where a finished drag or a nudge puts a folder or list: its parent, and the same-kind sibling it lands before. */
type Landing = Pick<TreeDropResult, 'id' | 'parentId' | 'beforeId'>

/**
 * The move side of the tree's write flows: a finished drag (`applyDrop`, web 3.3.0), the keyboard
 * up/down (`nudge`), and the drop projections the tree UI asks for. Every landing is one move call
 * with `before_id` (api-v4.2.0), inside one parent too: that call is the reorder. The mutations and
 * toast are passed in so the owning hook keeps its hook call order unchanged.
 */
export function createTreeMoves({
  index,
  sortable,
  toast,
  onCreatedFolder,
  moveFolder,
  moveList,
  meId,
  askMoveOut,
}: {
  index: TreeIndex | undefined
  sortable: ReturnType<typeof buildSortable> | undefined
  toast: ReturnType<typeof useToast>
  onCreatedFolder?: (parentId: string | null) => void
  moveFolder: ReturnType<typeof useMoveFolder>
  moveList: ReturnType<typeof useMoveList>
  /** The signed-in user, for the folders they may not move. */
  meId?: string
  /** Asks before a drag takes something out of a shared folder; `proceed` sends the move. */
  askMoveOut?: (ask: { name: string; box: Folder; proceed: () => void }) => void
}) {
  const applyDrop = ({ id, parentId, beforeId }: Landing) => {
    if (!index) return
    const folder = index.folders.get(id)
    const list = index.lists.get(id)
    if (!folder && !list) return
    const here = folder ? folder.parent_folder_id : list?.folder_id
    const target = parentId === null ? null : index.folders.get(parentId)
    if (target === undefined) return
    const sameParent = parentId === here
    const name = (folder ?? list)?.name ?? ''
    const onError = (error: unknown) => {
      const failure = classifyError(error, folder ? 'folder' : 'list', name)
      const specific =
        failure.kind === 'forbidden' ||
        failure.kind === 'shared' ||
        failure.kind === 'unavailable' ||
        failure.kind === 'stale'
      toast({
        kind: 'error',
        title: 'Couldn’t move it',
        description: specific
          ? failure.message
          : failure.kind === 'conflict'
            ? `“${name}” was changed somewhere else. The folders and lists were refreshed; please try again.`
            : 'The folders and lists were refreshed. Please try again.',
      })
    }
    const done = () => {
      if (parentId !== null) onCreatedFolder?.(parentId)
      toast({
        kind: 'success',
        title: `“${name}” moved`,
        description: target ? `Now inside “${target.name}”.` : 'Now at the top level.',
      })
    }
    // A reorder inside one parent is quiet on success, as it always was; the tree refetch shows it.
    const options = { onSuccess: sameParent ? undefined : done, onError }
    const send = () => {
      if (folder) moveFolder.mutate({ folder, parentId, beforeId, drag: true }, options)
      else if (list) moveList.mutate({ list, folderId: parentId, beforeId, drag: true }, options)
    }
    const box = leavesSharedBox(index, id, parentId)
    if (box && askMoveOut) askMoveOut({ name, box, proceed: send })
    else send()
  }

  const nudge = (id: string, delta: -1 | 1) => {
    const slot = sortable?.slots.get(id)
    const siblings = slot && sortable?.groups.get(slot.group)
    if (!slot || !siblings) return
    const to = slot.index + delta
    if (to < 0 || to >= slot.size) return
    // The row lands before whichever sibling ends up after it: the one now at `to` without it.
    const others = siblings.ids.filter((other) => other !== id)
    applyDrop({ id, parentId: siblings.parentId, beforeId: others[to] ?? null })
    toast({
      kind: 'success',
      title: `${slot.label} moved ${delta < 0 ? 'up' : 'down'}`,
      description: `Position ${to + 1} of ${slot.size}.`,
    })
  }

  const position = (id: string) => {
    const slot = sortable?.slots.get(id)
    return slot && { index: slot.index, size: slot.size }
  }

  const project = (expanded: ReadonlySet<string>, sourceId: string, hit: TreeHit) =>
    index ? projectDrop({ index, expanded, meId }, sourceId, hit) : null

  const steps = (expanded: ReadonlySet<string>, sourceId: string) =>
    index ? dropSteps({ index, expanded, meId }, sourceId) : []

  return { position, applyDrop, projectDrop: project, dropSteps: steps, nudge }
}
