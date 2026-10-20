import { useQuery } from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { api, unwrap } from '../../lib/api'

export type StoreProvider = components['schemas']['StoreProvider']

const storeKeys = { providers: ['store-providers'] as const }

/**
 * The fixed store list (F016-W4). It changes only with a deploy, so it is kept for a day; the item
 * editor, the item detail, the list rows and Settings all read the same cached answer.
 */
const PROVIDERS_STALE_MS = 24 * 60 * 60 * 1000

/** `GET /store-providers`: every store, in display order, with its display name. */
export function useStoreProviders() {
  return useQuery({
    queryKey: storeKeys.providers,
    queryFn: ({ signal }) => unwrap(api.GET('/api/v1/store-providers', { signal })),
    select: (data) => data.providers,
    staleTime: PROVIDERS_STALE_MS,
  })
}
