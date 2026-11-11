import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { api, ifMatch, unwrap } from '../../lib/api'
import { settingsKeys, typeKeys } from '../../data/keys'

export type Settings = components['schemas']['Settings']
export type UpdateSettingsRequest = components['schemas']['UpdateSettingsRequest']
export type TypeDefinition = components['schemas']['TypeDefinition']
export type TypeField = components['schemas']['TypeField']

// Provider bookkeeping (TMDB id, Open Library work id, lookup switch) lives in item metadata but is
// never user-facing: not an editable field, and never sortable or filterable.
const BOOKKEEPING_FIELDS = new Set(['tmdb_id', 'lookup_disabled', 'openlibrary_id'])
const withoutBookkeeping = (types: TypeDefinition[]): TypeDefinition[] =>
  types.map((type) => ({
    ...type,
    fields: type.fields.filter((field) => !BOOKKEEPING_FIELDS.has(field.key)),
  }))

export function useTypes() {
  return useQuery({
    queryKey: typeKeys.types,
    // F-023: the definitions are the backend's code (api-v3.0.0), so they cannot change while the app runs.
    staleTime: Infinity,
    select: withoutBookkeeping,
    // The list itself is still nullable in the contract (api-v1.0.1 types `GET /types` as
    // `TypeDefinition[] | null`): an absent list is no types.
    queryFn: async ({ signal }) => (await unwrap(api.GET('/api/v1/types', { signal }))) ?? [],
  })
}

export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.settings,
    queryFn: ({ signal }) => unwrap(api.GET('/api/v1/settings', { signal })),
  })
}

/**
 * `PATCH /settings`. `If-Match` comes from the version of the settings the form was opened on, and a
 * 412 is never retried. The response replaces the cached settings, so the item form's defaults
 * update at once.
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
