import { queryOptions, useQuery } from '@tanstack/react-query'
import { healthKeys } from '../../data/keys'
import { api, unwrap } from '../../lib/api'

export type BackendStatus = 'checking' | 'ready' | 'down'

/** Readiness probe (outside /api/v1): DB reachable and data dir writable. The body is plain text. */
const readyOptions = queryOptions({
  queryKey: healthKeys.ready,
  queryFn: ({ signal }) => unwrap(api.GET('/readyz', { parseAs: 'text', signal })),
  retry: false,
  staleTime: 0,
})

/** The probe's state, plus `check()` to run it again. `checking` also covers a re-check in flight. */
export function useBackendCheck(): { status: BackendStatus; check: () => void } {
  const { status, isFetching, refetch } = useQuery(readyOptions)
  const settled = status === 'pending' ? 'checking' : status === 'success' ? 'ready' : 'down'
  return { status: isFetching ? 'checking' : settled, check: () => void refetch() }
}
