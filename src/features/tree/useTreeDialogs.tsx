import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { useToast } from '../../components/ui'
import { arrayMove, type SortableMove } from '../../components/ui/sortable'
import { treeKeys, useTreeIndex, type TreeData, type TreeNode } from './api'
import { DeleteDialog } from './DeleteDialog'
import {
  useCreateFolder,
  useCreateList,
  useDeleteFolder,
  useDeleteList,
  useMoveFolder,
  useMoveList,
  useRenameFolder,
  useReorderSiblings,
  useUpdateList,
} from './mutations'
import { MoveDialog } from './MoveDialog'
import { NameDialog } from './NameDialog'
import { countsText } from '../trash/model'
import { buildSortable, canDropInto, subtreeCounts } from './order'

type DialogState =
  | { type: 'create'; kind: 'folder' | 'list'; parentId: string | null }
  | { type: 'rename' | 'move' | 'delete'; id: string }

/** What the menus can ask for. Every method takes ids, so a menu never holds a stale object. */
export interface TreeActions {
  createFolder: (parentId: string | null) => void
  createList: (parentId: string | null) => void
  rename: (id: string) => void
  move: (id: string) => void
  remove: (id: string) => void
  /** Moves a node one place among its siblings of the same kind (-1 up, +1 down). */
  nudge: (id: string, delta: -1 | 1) => void
  /** Position among same-kind siblings, or `undefined` while the tree is loading. */
  position: (id: string) => { index: number; size: number } | undefined
  /** Applies a finished drag: a reorder between rows, or a move into a folder (`move.into`). */
  applyMove: (move: SortableMove) => void
  /** Whether dropping the node `sourceId` onto folder `folderId` is a valid move. */
  canDropInto: (sourceId: string, folderId: string) => boolean
}

const nameOf = (node: TreeNode) => (node.kind === 'folder' ? node.folder.name : node.list.name)

/**
 * All the tree's write flows: create, rename, move, delete, move up/down and drag
 * reorder. Returns the `actions` to hang on menus and the `dialogs` element to render once.
 * `onCreatedFolder` lets the sidebar expand the parent so the new folder is visible.
 */
export function useTreeDialogs({
  onCreatedFolder,
  onCreated,
  focusCreated,
}: {
  onCreatedFolder?: (parentId: string | null) => void
  /** A folder or list was just created (the dialog is still closing): select it. */
  onCreated?: (id: string) => void
  /** The create dialog has closed: move focus to the new row instead of back to the opener. */
  focusCreated?: (id: string) => void
} = {}): {
  actions: TreeActions
  dialogs: ReactNode
} {
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const result = useTreeIndex()
  const index = result.status === 'success' ? result.index : undefined
  const queryClient = useQueryClient()
  const toast = useToast()
  const navigate = useNavigate()
  const activeListId = useMatch({ path: '/lists/:listId', end: false })?.params.listId ?? null

  const createFolder = useCreateFolder()
  const createList = useCreateList()
  const renameFolder = useRenameFolder()
  const updateList = useUpdateList()
  const moveFolder = useMoveFolder()
  const moveList = useMoveList()
  const deleteFolder = useDeleteFolder()
  const deleteList = useDeleteList()
  const reorder = useReorderSiblings()

  const sortable = useMemo(() => (index ? buildSortable(index.nodes) : undefined), [index])
  const close = () => setDialog(null)
  const created = useRef<string | null>(null)

  /** Refetches the tree and returns it, so a dialog can pick up the latest version. */
  const reload = async (): Promise<TreeData | undefined> => {
    await queryClient.refetchQueries({ queryKey: treeKeys.tree })
    return queryClient.getQueryData<TreeData>(treeKeys.tree)
  }

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

  const actions: TreeActions = {
    createFolder: (parentId) => setDialog({ type: 'create', kind: 'folder', parentId }),
    createList: (parentId) => setDialog({ type: 'create', kind: 'list', parentId }),
    rename: (id) => setDialog({ type: 'rename', id }),
    move: (id) => setDialog({ type: 'move', id }),
    remove: (id) => setDialog({ type: 'delete', id }),
    position: (id) => {
      const slot = sortable?.slots.get(id)
      return slot && { index: slot.index, size: slot.size }
    },
    applyMove,
    canDropInto: (sourceId, folderId) => !!index && canDropInto(index, sourceId, folderId),
    nudge: (id, delta) => {
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
    },
  }

  let content: ReactNode = null
  if (dialog && index) {
    if (dialog.type === 'create') {
      const parent = dialog.parentId ? index.folders.get(dialog.parentId) : undefined
      const isFolder = dialog.kind === 'folder'
      content = (
        <NameDialog
          key={`create-${dialog.kind}-${dialog.parentId}`}
          title={isFolder ? 'New folder' : 'New list'}
          description={
            parent
              ? `It will be created inside “${parent.name}”.`
              : 'It will be created at the top level.'
          }
          submitLabel="Create"
          noun={dialog.kind}
          kind={isFolder ? undefined : { initial: 'generic' }}
          onClose={close}
          onCloseAutoFocus={(event) => {
            const id = created.current
            if (!id || !focusCreated) return
            created.current = null
            event.preventDefault()
            focusCreated(id)
          }}
          onSubmit={async (name, kind) => {
            if (isFolder) {
              const folder = await createFolder.mutateAsync({ name, parentId: dialog.parentId })
              created.current = folder.id
              onCreated?.(folder.id)
              onCreatedFolder?.(dialog.parentId)
              toast({ kind: 'success', title: `Folder “${name}” created` })
            } else {
              const list = await createList.mutateAsync({ name, kind, folderId: dialog.parentId })
              created.current = list.id
              onCreated?.(list.id)
              toast({ kind: 'success', title: `List “${name}” created` })
              void navigate(`/lists/${list.id}`)
            }
          }}
        />
      )
    } else {
      const node = findNode(index.nodes, dialog.id)
      if (!node) {
        // Removed elsewhere while the dialog was open: close it and say why.
        content = (
          <Vanished
            onGone={() => {
              close()
              toast({
                kind: 'info',
                title: 'That item no longer exists',
                description: 'The folders and lists were refreshed.',
              })
            }}
          />
        )
      } else {
        const name = nameOf(node)
        if (dialog.type === 'rename') {
          content = (
            <NameDialog
              key={`rename-${node.id}`}
              title={node.kind === 'folder' ? 'Rename folder' : 'Rename list'}
              submitLabel="Save"
              noun={node.kind}
              initialName={name}
              onClose={close}
              onReload={async () => {
                const data = await reload()
                return node.kind === 'folder'
                  ? data?.folders.find((f) => f.id === node.id)?.name
                  : data?.lists.find((l) => l.id === node.id)?.name
              }}
              onSubmit={async (next) => {
                if (node.kind === 'folder')
                  await renameFolder.mutateAsync({ folder: node.folder, name: next })
                else await updateList.mutateAsync({ list: node.list, patch: { name: next } })
                toast({ kind: 'success', title: `Renamed to “${next}”` })
              }}
            />
          )
        } else if (dialog.type === 'move') {
          content = (
            <MoveDialog
              key={`move-${node.id}`}
              node={node}
              index={index}
              onClose={close}
              onReload={reload}
              onSubmit={async (destinationId) => {
                if (node.kind === 'folder')
                  await moveFolder.mutateAsync({ folder: node.folder, parentId: destinationId })
                else await moveList.mutateAsync({ list: node.list, folderId: destinationId })
                const destination = destinationId
                  ? index.folders.get(destinationId)?.name
                  : undefined
                toast({
                  kind: 'success',
                  title: `“${name}” moved`,
                  description: destination
                    ? `Now inside “${destination}”.`
                    : 'Now at the top level.',
                })
                if (destinationId) onCreatedFolder?.(destinationId)
              }}
            />
          )
        } else if (dialog.type === 'delete') {
          const counts = subtreeCounts(node)
          const contents = countsText(counts)
          content = (
            <DeleteDialog
              key={`delete-${node.id}`}
              noun={node.kind}
              name={name}
              contents={contents}
              onClose={close}
              onReload={reload}
              onConfirm={async () => {
                const wasActive =
                  activeListId !== null &&
                  (activeListId === node.id ||
                    index.ancestorsOf(activeListId).some((a) => a.id === node.id))
                if (node.kind === 'folder') await deleteFolder.mutateAsync(node.folder)
                else await deleteList.mutateAsync(node.list)
                toast({ kind: 'success', title: `“${name}” moved to Trash` })
                if (wasActive) void navigate('/')
              }}
            />
          )
        }
      }
    }
  }

  return { actions, dialogs: content }
}

function findNode(nodes: readonly TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.kind === 'folder') {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return undefined
}

/** Renders nothing; tells its owner once that the dialog's target is gone. */
function Vanished({ onGone }: { onGone: () => void }) {
  useEffect(() => onGone(), [onGone])
  return null
}
