import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from '../../lib/api'

export const settingsKeys = { settings: ['settings'] as const }

/** W-13 extends this with the editable fields and the PATCH mutation. */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.settings,
    queryFn: ({ signal }) => unwrap(api.GET('/api/v1/settings', { signal })),
  })
}

/** The workspace name for the sidebar, with a neutral fallback while loading or on failure. */
export function useWorkspaceName(): string {
  return useSettings().data?.workspace_name || 'Collection'
}
