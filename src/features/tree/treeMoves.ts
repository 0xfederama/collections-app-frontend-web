import type { useToast } from '../../components/ui'
import { arrayMove, type SortableMove } from '../../components/ui/sortable'
import type { TreeIndex } from './api'
import type { useMoveFolder, useMoveList, useReorderSiblings } from './mutations'
import { buildSortable, canDropInto } from './order'

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
}: {
  index: TreeIndex | undefined
  sortable: ReturnType<typeof buildSortable> | undefined
  toast: ReturnType<typeof useToast>
  onCreatedFolder?: (parentId: string | null) => void
  moveFolder: ReturnType<typeof useMoveFolder>
  moveList: ReturnType<typeof useMoveList>
  reorder: ReturnType<typeof useReorderSiblings>
}) {
  const applyMove = ({ id, group, from, to, into }: SortableMove) => {
    if (into !== undefined) {
      // Dropped onto a folder: a real move, appended last by the server (D-060). The body always names the parent.
      const folder = index?.folders.get(id)
      const list = index?.lists.get(id)
      const target = index?.folders.get(into)
      if (!index || !target || !canDropInto(index, id, into)) return
      const onError = () =>
        toast({
          kind: 'error',
          title: 'Couldn’t move it',
          description: 'The folders and lists were refreshed. Please try again.',
        })
      const done = () => {
        onCreatedFolder?.(into)
        toast({
          kind: 'success',
          title: `“${(folder ?? list)?.name}” moved`,
          description: `Now inside “${target.name}”.`,
        })
      }
      if (folder) moveFolder.mutate({ folder, parentId: into }, { onSuccess: done, onError })
      else if (list) moveList.mutate({ list, folderId: into }, { onSuccess: done, onError })
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
    !!index && canDropInto(index, sourceId, folderId)

  return { position, applyMove, canDropInto: dropInto, nudge }
}
