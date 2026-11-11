import type { useToast } from '../../components/ui'
import { arrayMove, type SortableMove } from '../../components/ui/sortable'
import type { Folder, TreeIndex } from './api'
import { classifyError } from './errors'
import type { useMoveFolder, useMoveList, useReorderSiblings } from './mutations'
import { buildSortable, canDropInto, canDropToTop } from './order'
import { leavesSharedBox } from './sharing/leavesBox'

/**
 * The move side of the tree's write flows: drag reorder and move into a folder (`applyMove`),
 * and the keyboard up/down (`nudge`), plus the position and drop checks the menus read. The mutations and toast are passed in so the owning hook
 * keeps its hook call order unchanged.
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
  const applyMove = ({ id, group, from, to, into }: SortableMove) => {
    if (into !== undefined) {
      // Dropped onto a folder (or the top-level zone, `into: null`): a real move, appended last by
      // the server (D-060). The body always names the parent.
      const folder = index?.folders.get(id)
      const list = index?.lists.get(id)
      const target = into === null ? null : index?.folders.get(into)
      if (!index || target === undefined) return
      if (into === null ? !canDropToTop(index, id, meId) : !canDropInto(index, id, into, meId))
        return
      const name = (folder ?? list)?.name ?? ''
      const onError = (error: unknown) => {
        const failure = classifyError(error, folder ? 'folder' : 'list', name)
        const specific =
          failure.kind === 'forbidden' ||
          failure.kind === 'shared' ||
          failure.kind === 'unavailable'
        toast({
          kind: 'error',
          title: 'Couldn’t move it',
          description: specific
            ? failure.message
            : 'The folders and lists were refreshed. Please try again.',
        })
      }
      const done = () => {
        if (into !== null) onCreatedFolder?.(into)
        toast({
          kind: 'success',
          title: `“${(folder ?? list)?.name}” moved`,
          description: target ? `Now inside “${target.name}”.` : 'Now at the top level.',
        })
      }
      const send = () => {
        if (folder) moveFolder.mutate({ folder, parentId: into }, { onSuccess: done, onError })
        else if (list) moveList.mutate({ list, folderId: into }, { onSuccess: done, onError })
      }
      const box = leavesSharedBox(index, id, into)
      if (box && askMoveOut) askMoveOut({ name, box, proceed: send })
      else send()
      return
    }
    const siblings = sortable?.groups.get(group)
    if (!siblings || from === to) return
    reorder.mutate({
      kind: siblings.kind,
      parentId: siblings.parentId,
      ids: arrayMove(siblings.ids, from, to),
    })
  }

  const nudge = (id: string, delta: -1 | 1) => {
    const slot = sortable?.slots.get(id)
    if (!slot) return
    const to = slot.index + delta
    if (to < 0 || to >= slot.size) return
    applyMove({ id, group: slot.group, from: slot.index, to })
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

  const dropInto = (sourceId: string, folderId: string) =>
    !!index && canDropInto(index, sourceId, folderId, meId)

  const dropToTop = (sourceId: string) => !!index && canDropToTop(index, sourceId, meId)

  return { position, applyMove, canDropInto: dropInto, canDropToTop: dropToTop, nudge }
}
