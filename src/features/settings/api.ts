import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { api, ifMatch, unwrap } from '../../lib/api'

export type Settings = components['schemas']['Settings']
export type UpdateSettingsRequest = components['schemas']['UpdateSettingsRequest']

export const settingsKeys = { settings: ['settings'] as const }

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

/**
 * `PATCH /settings`. `If-Match` comes from the version of the settings the form was opened on, and a
 * 412 is never retried. The response replaces the cached settings, so the sidebar's workspace name
 * and the item form's defaults update at once.
 */
export function useUpdateSettings() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ base, patch }: { base: Settings; patch: UpdateSettingsRequest }) =>
      unwrap(
        api.PATCH('/api/v1/settings', {
          params: { header: ifMatch('settings', base.version) },
          body: patch,
        }),
      ),
    onSuccess: (updated) => {
      client.setQueryData<Settings>(settingsKeys.settings, updated)
    },
  })
}
