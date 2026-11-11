import { useMutation, useQueryClient } from '@tanstack/react-query'
import { treeKeys } from '../../../data/keys'
import { api, unwrap } from '../../../lib/api'

/**
 * Sharing writes (F-027 W3). They need no `If-Match` and don't bump the folder version, so they
 * just refetch the tree. Never retried (mutation defaults).
 */
export function useShareFolder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ folderId, email }: { folderId: string; email: string }) =>
      unwrap(
        api.POST('/api/v1/folders/{id}/members', {
          params: { path: { id: folderId } },
          body: { email },
        }),
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: treeKeys.tree }),
  })
}

/** The owner removes a member, or a member removes themself (leave). */
export function useRemoveFolderMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ folderId, userId }: { folderId: string; userId: string }) => {
      await api.DELETE('/api/v1/folders/{id}/members/{user_id}', {
        params: { path: { id: folderId, user_id: userId } },
      })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: treeKeys.tree }),
  })
}
