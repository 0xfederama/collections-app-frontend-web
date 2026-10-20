import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router'
import { useToast } from '../../components/ui'
import type { SortableMove } from '../../components/ui/sortable'
import { treeKeys } from '../../data/keys'
import { useTreeIndex, type TreeData } from './api'
import { DeleteDialog } from './DeleteDialog'
import { findNode, isOpenWithin, nameOf } from './treeLookup'
import { Vanished } from './Vanished'
import { ListIconDialog } from './ListIconDialog'
import { readLastListFolder, rememberListFolder } from './listFolderMemory'
import { createTreeMoves } from './treeMoves'
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
import { MoveDialog, listPathOptions } from './MoveDialog'
import { NameDialog } from './NameDialog'
import { countsText } from '../trash'
import { buildSortable, subtreeCounts } from './order'

type DialogState =
  | { type: 'create'; kind: 'folder' | 'list'; parentId: string | null }
  | { type: 'rename' | 'move' | 'delete' | 'icon'; id: string }

/** What the menus can ask for. Every method takes ids, so a menu never holds a stale object. */
export interface TreeActions {
  createFolder: (parentId: string | null) => void
  createList: (parentId: string | null) => void
  rename: (id: string) => void
  move: (id: string) => void
  remove: (id: string) => void
  /** Opens the list icon dialog (lists only; a folder has no icon). */
  changeIcon: (id: string) => void
  /** Moves a node one place among its siblings of the same kind (-1 up, +1 down). */
  nudge: (id: string, delta: -1 | 1) => void
  /** Position among same-kind siblings, or `undefined` while the tree is loading. */
  position: (id: string) => { index: number; size: number } | undefined
  /** Applies a finished drag: a reorder between rows, or a move into a folder (`move.into`). */
  applyMove: (move: SortableMove) => void
  /** Whether dropping the node `sourceId` onto folder `folderId` is a valid move. */
  canDropInto: (sourceId: string, folderId: string) => boolean
}

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
  const location = useLocation()
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
  // "+ New type" in the New list dialog: Settings opens over the current page on the Types pane.
  // `pane` is a hint the Settings route may read; unknown values must be ignored there.
  const openTypesSettings = () => {
    close()
    void navigate('/settings?pane=types', { state: { background: location } })
  }
  const created = useRef<string | null>(null)

  /** Refetches the tree and returns it, so a dialog can pick up the latest version. */
  const reload = async (): Promise<TreeData | undefined> => {
    await queryClient.refetchQueries({ queryKey: treeKeys.tree })
    return queryClient.getQueryData<TreeData>(treeKeys.tree)
  }

  const { position, applyMove, canDropInto, nudge } = createTreeMoves({
    index,
    sortable,
    toast,
    onCreatedFolder,
    moveFolder,
    moveList,
    reorder,
  })

  const actions: TreeActions = {
    createFolder: (parentId) => setDialog({ type: 'create', kind: 'folder', parentId }),
    createList: (parentId) => setDialog({ type: 'create', kind: 'list', parentId }),
    rename: (id) => setDialog({ type: 'rename', id }),
    move: (id) => setDialog({ type: 'move', id }),
    remove: (id) => setDialog({ type: 'delete', id }),
    changeIcon: (id) => setDialog({ type: 'icon', id }),
    position,
    applyMove,
    canDropInto,
    nudge,
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
          type={isFolder ? undefined : { initial: null }}
          listIcon={!isFolder}
          // Only a list can be aimed at a folder from the dialog; a folder keeps its opener's parent.
          path={
            isFolder
              ? undefined
              : {
                  options: listPathOptions(index),
                  initial: dialog.parentId ?? readLastListFolder(),
                }
          }
          onClose={close}
          onNewType={isFolder ? undefined : openTypesSettings}
          onCloseAutoFocus={(event) => {
            const id = created.current
            if (!id || !focusCreated) return
            created.current = null
            event.preventDefault()
            focusCreated(id)
          }}
          onSubmit={async (name, type, folderId, icon) => {
            if (isFolder) {
              const folder = await createFolder.mutateAsync({ name, parentId: dialog.parentId })
              created.current = folder.id
              onCreated?.(folder.id)
              onCreatedFolder?.(dialog.parentId)
              toast({ kind: 'success', title: `Folder “${name}” created` })
            } else {
              const list = await createList.mutateAsync({ name, type, folderId, icon })
              created.current = list.id
              onCreated?.(list.id)
              // The next "New list" opens on the folder this one went into (session only).
              rememberListFolder(folderId)
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
        } else if (dialog.type === 'icon') {
          // A folder has no icon: the dialog simply does not open for it.
          if (node.kind === 'list')
            content = <ListIconDialog key={`icon-${node.id}`} list={node.list} onClose={close} />
        } else if (dialog.type === 'delete') {
          content = (
            <DeleteDialog
              key={`delete-${node.id}`}
              noun={node.kind}
              name={name}
              contents={countsText(subtreeCounts(node))}
              onClose={close}
              onReload={reload}
              onConfirm={async () => {
                const wasActive = isOpenWithin(index, activeListId, node.id)
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
