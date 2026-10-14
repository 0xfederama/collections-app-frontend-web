import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '../../lib/api'

export type BackendStatus = 'checking' | 'ready' | 'down'

export const healthKeys = { ready: ['health', 'readyz'] as const }

/** Readiness probe (outside /api/v1): DB reachable and data dir writable. The body is plain text. */
export function useBackendStatus(): BackendStatus {
  const { status } = useQuery({
    queryKey: healthKeys.ready,
    queryFn: ({ signal }) => unwrap(api.GET('/readyz', { parseAs: 'text', signal })),
    retry: false,
    staleTime: 0,
  })
  return status === 'pending' ? 'checking' : status === 'success' ? 'ready' : 'down'
}
