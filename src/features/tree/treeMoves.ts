import type { TreeHit, useToast } from '../../components/ui'
import { arrayMove } from '../../components/ui/sortable'
import type { Folder, TreeIndex } from './api'
import { classifyError } from './errors'
import { dropSteps, projectDrop, type TreeDropResult } from './model/drop'
import type { useMoveFolder, useMoveList, useReorderSiblings } from './mutations'
import { buildSortable, groupKey } from './order'
import { leavesSharedBox } from './sharing/leavesBox'

/**
 * The move side of the tree's write flows: a finished drag (`applyDrop`, web 3.3.0: a reorder inside
 * one parent, or a move with its position into another), the keyboard up/down (`nudge`), and the drop
 * projections the tree UI asks for. The mutations and toast are passed in so the owning hook keeps its
 * hook call order unchanged.
 */
export function createTreeMoves({
  index,
  sortable,
  toast,
  onCreatedFolder,
  moveFolder,
  moveList,
  reorder,
  meId,
  askMoveOut,
}: {
  index: TreeIndex | undefined
  sortable: ReturnType<typeof buildSortable> | undefined
  toast: ReturnType<typeof useToast>
  onCreatedFolder?: (parentId: string | null) => void
  moveFolder: ReturnType<typeof useMoveFolder>
  moveList: ReturnType<typeof useMoveList>
  reorder: ReturnType<typeof useReorderSiblings>
  /** The signed-in user, for the folders they may not move. */
  meId?: string
  /** Asks before a drag takes something out of a shared folder; `proceed` sends the move. */
  askMoveOut?: (ask: { name: string; box: Folder; proceed: () => void }) => void
}) {
  const applyDrop = ({ id, kind, parentId, beforeId }: TreeDropResult) => {
    if (!index) return
    const folder = index.folders.get(id)
    const list = index.lists.get(id)
    const here = folder ? folder.parent_folder_id : list?.folder_id
    if (!folder && !list) return
    if (parentId === here) {
      // Same parent: the full new order of that kind, as the reorder call wants it.
      const siblings = sortable?.groups.get(groupKey(kind, parentId))
      if (!siblings) return
      const others = siblings.ids.filter((other) => other !== id)
      const at = beforeId === null ? others.length : others.indexOf(beforeId)
      if (at < 0) return
      reorder.mutate({ kind, parentId, ids: [...others.slice(0, at), id, ...others.slice(at)] })
      return
    }
    // Another parent: a real move at an exact place (atomic `before_id`, null = last of its kind).
    const target = parentId === null ? null : index.folders.get(parentId)
    if (target === undefined) return
    const name = (folder ?? list)?.name ?? ''
    const onError = (error: unknown) => {
      const failure = classifyError(error, folder ? 'folder' : 'list', name)
      const specific =
        failure.kind === 'forbidden' || failure.kind === 'shared' || failure.kind === 'unavailable'
      toast({
        kind: 'error',
        title: 'Couldn’t move it',
        description: specific
          ? failure.message
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
    const send = () => {
      if (folder) moveFolder.mutate({ folder, parentId, beforeId }, { onSuccess: done, onError })
      else if (list)
        moveList.mutate({ list, folderId: parentId, beforeId }, { onSuccess: done, onError })
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
    reorder.mutate({
      kind: siblings.kind,
      parentId: siblings.parentId,
      ids: arrayMove(siblings.ids, slot.index, to),
    })
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
