import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ItemType } from '../../components/ui'
import { api, ifMatch, unwrap } from '../../lib/api'
import { invalidateContent } from '../../data/invalidate'
import type { IconChoice } from '../lists'
import type { Folder, List } from './api'
import { shouldRefreshTree } from './errors'

/**
 * Tree writes (folders and lists). Every write sends `If-Match` built from the version the user
 * saw, is never retried (mutation defaults), and refetches all content (`invalidateContent`) when it succeeds. Move bodies
 * always carry the parent field, `null` meaning the root (D-060); a drag's position travels as `before_id`.
 *
 * A 412 does NOT refetch: the dialog keeps the user's draft and the stale version, so a second
 * click cannot silently overwrite the other change. "Reload latest" is the explicit way out.
 */
const isDrag = (vars: unknown) =>
  typeof vars === 'object' && vars !== null && 'drag' in vars && vars.drag === true

function useTreeMutation<TVars, TData = unknown>(mutationFn: (vars: TVars) => Promise<TData>) {
  const queryClient = useQueryClient()
  const refresh = () => invalidateContent(queryClient)
  return useMutation({
    mutationFn,
    onSuccess: refresh,
    onError: (error, vars) => {
      // A drag keeps no draft, so even a 412 refetches: the next drag starts from the latest tree.
      if (shouldRefreshTree(error) || isDrag(vars)) void refresh()
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
      /** Sent by a drag: no draft to protect, so a 412 refetches too. */
      drag?: boolean
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
      /** Sent by a drag: no draft to protect, so a 412 refetches too. */
      drag?: boolean
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
