import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/ui'
import { invalidateContent } from '../../data/invalidate'
import { api, ApiError, failureKind, unwrap } from '../../lib/api'
import { refreshSummary } from './refreshMessage'

/**
 * "Refresh details" for a list (F-025 W11, D-123): `POST /lists/{id}/lookup-refresh`, no `If-Match`.
 * One call refreshes at most 50 items through the server's paced TMDB client, so it can take a
 * while; a "Refreshing details…" toast says so. When items remain, the result toast offers
 * "Run again". Content is refetched afterwards so the list shows the new details.
 */
export function useRefreshDetails(listId: string) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const mutation = useMutation({
    mutationFn: () =>
      unwrap(api.POST('/api/v1/lists/{id}/lookup-refresh', { params: { path: { id: listId } } })),
  })

  const run = async (): Promise<void> => {
    toast({ kind: 'info', title: 'Refreshing details…' })
    try {
      const counts = await mutation.mutateAsync()
      void invalidateContent(queryClient)
      const { title, description, kind } = refreshSummary(counts)
      toast({
        kind,
        title,
        description,
        action:
          counts.remaining > 0 ? { label: 'Run again', onAction: () => void run() } : undefined,
      })
    } catch (error) {
      toast({ kind: 'error', title: 'Couldn’t refresh details', description: failureText(error) })
    }
  }

  return { run, pending: mutation.isPending }
}

function failureText(error: unknown): string {
  if (error instanceof ApiError && error.code === 'lookup_disabled') {
    return 'Details lookup is turned off on the server'
  }
  switch (failureKind(error)) {
    case 'not_found':
      return 'This list no longer exists.'
    case 'unavailable':
      return 'The server could not be reached or is busy. Please try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
