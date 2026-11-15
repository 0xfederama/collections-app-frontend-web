import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast, type ItemType } from '../../components/ui'
import { api, ifMatch, isOrderStale, unwrap } from '../../lib/api'
import { invalidateContent } from '../../data/invalidate'
import type { IconChoice } from '../lists'
import { treeKeys } from '../../data/keys'
import type { Folder, List, TreeData } from './api'
import { ORDER_STALE_MESSAGE, shouldRefreshTree } from './errors'
import { applyOrder, type SiblingKind } from './order'

/**
 * Tree writes (folders and lists). Every write sends `If-Match` built from the version the user
 * saw, is never retried (mutation defaults), and refetches all content (`invalidateContent`) when it succeeds. Move and
 * reorder bodies always carry the parent field, `null` meaning the root (D-060).
 *
 * A 412 does NOT refetch: the dialog keeps the user's draft and the stale version, so a second
 * click cannot silently overwrite the other change. "Reload latest" is the explicit way out.
 */
function useTreeMutation<TVars, TData = unknown>(mutationFn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient()
  const refresh = () => invalidateContent(queryClient)
  return useMutation({
    mutationFn,
    onSuccess: refresh,
    onError: (error) => {
      if (shouldRefreshTree(error)) void refresh()
    },
  })
}

export function useCreateFolder() {
  return useTreeMutation(({ name, parentId }: { name: string; parentId: string | null }) =>
    unwrap(api.POST('/api/v1/folders', { body: { name, parent_folder_id: parentId } })),
  )
}

export function useCreateList() {
  return useTreeMutation(
    ({
      name,
      type,
      folderId,
      icon,
    }: {
      name: string
      type: ItemType
      folderId: string | null
      icon: IconChoice
    }) =>
      unwrap(
        api.POST('/api/v1/lists', {
          body: { name, type, folder_id: folderId, icon: icon.icon, icon_color: icon.icon_color },
        }),
      ),
  )
}

/** List icon edits use the list snapshot captured when the picker opened (D-083). */
export function useUpdateListIcon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ list, icon }: { list: List; icon: IconChoice }) =>
      unwrap(
        api.PATCH('/api/v1/lists/{id}', {
          params: { path: { id: list.id }, header: ifMatch('list', list.version) },
          body: { icon: icon.icon, icon_color: icon.icon_color },
        }),
      ),
    onSuccess: () => invalidateContent(queryClient),
  })
}

export function useRenameFolder() {
  return useTreeMutation(({ folder, name }: { folder: Folder; name: string }) =>
    unwrap(
      api.PATCH('/api/v1/folders/{id}', {
        params: { path: { id: folder.id }, header: ifMatch('folder', folder.version) },
        body: { name },
      }),
    ),
  )
}

export function useUpdateList() {
  return useTreeMutation(
    ({
      list,
      patch,
    }: {
      list: List
      /** `description: null` clears it. A `type` change clears the type fields of all the list's items. */
      patch: { name?: string; type?: ItemType; description?: string | null }
    }) =>
      unwrap(
        api.PATCH('/api/v1/lists/{id}', {
          params: { path: { id: list.id }, header: ifMatch('list', list.version) },
          body: patch,
        }),
      ),
  )
}

// TODO(api-v4.2.0): drop this extension after `api:sync`. The move bodies gain an optional
// `before_id` (the same-kind sibling to land before; null or absent = last of its kind, atomic), but
// the generated types of api-v4.1.0 do not have it yet.
type WithBefore<T> = T & { before_id?: string | null }

/** `beforeId` is sent only when given (a drag); the Move dialog omits it, which appends. */
export function useMoveFolder() {
  return useTreeMutation(
    ({
      folder,
      parentId,
      beforeId,
    }: {
      folder: Folder
      parentId: string | null
      beforeId?: string | null
    }) => {
      const body: WithBefore<{ parent_folder_id: string | null }> = { parent_folder_id: parentId }
      if (beforeId !== undefined) body.before_id = beforeId
      return unwrap(
        api.POST('/api/v1/folders/{id}/move', {
          params: { path: { id: folder.id }, header: ifMatch('folder', folder.version) },
          body,
        }),
      )
    },
  )
}

export function useMoveList() {
  return useTreeMutation(
    ({
      list,
      folderId,
      beforeId,
    }: {
      list: List
      folderId: string | null
      beforeId?: string | null
    }) => {
      const body: WithBefore<{ folder_id: string | null }> = { folder_id: folderId }
      if (beforeId !== undefined) body.before_id = beforeId
      return unwrap(
        api.POST('/api/v1/lists/{id}/move', {
          params: { path: { id: list.id }, header: ifMatch('list', list.version) },
          body,
        }),
      )
    },
  )
}

export function useDeleteFolder() {
  return useTreeMutation(async (folder: Folder) => {
    await api.DELETE('/api/v1/folders/{id}', {
      params: { path: { id: folder.id }, header: ifMatch('folder', folder.version) },
    })
  })
}

export function useDeleteList() {
  return useTreeMutation(async (list: List) => {
    await api.DELETE('/api/v1/lists/{id}', {
      params: { path: { id: list.id }, header: ifMatch('list', list.version) },
    })
  })
}

export interface ReorderVars {
  kind: SiblingKind
  /** Parent folder id, `null` = root. */
  parentId: string | null
  /** All siblings of that kind under that parent, in the new order. */
  ids: string[]
}

/**
 * Reorders siblings. The tree is updated before the server answers (optimistic) and restored if
 * the write fails. `409 order_stale` means the siblings changed elsewhere: roll back, refetch and
 * tell the user (UI_SPEC §9).
 */
export function useReorderSiblings() {
  const queryClient = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: async ({ kind, parentId, ids }: ReorderVars) => {
      if (kind === 'folder') {
        await api.PUT('/api/v1/folders/order', { body: { parent_folder_id: parentId, ids } })
      } else {
        await api.PUT('/api/v1/lists/order', { body: { folder_id: parentId, ids } })
      }
    },
    onMutate: async ({ kind, ids }) => {
      await queryClient.cancelQueries({ queryKey: treeKeys.tree })
      const previous = queryClient.getQueryData<TreeData>(treeKeys.tree)
      if (previous) queryClient.setQueryData(treeKeys.tree, applyOrder(previous, kind, ids))
      return { previous }
    },
    onError: (error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(treeKeys.tree, context.previous)
      if (isOrderStale(error)) {
        toast({ kind: 'info', title: ORDER_STALE_MESSAGE })
      } else {
        toast({
          kind: 'error',
          title: 'Couldn’t save the new order',
          description: 'The previous order was restored. Please try again.',
        })
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: treeKeys.tree }),
  })
}
