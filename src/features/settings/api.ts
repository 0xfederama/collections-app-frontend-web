import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { api, ifMatch, unwrap } from '../../lib/api'
import { invalidateContent } from '../../data/invalidate'
import { settingsKeys, typeKeys } from '../../data/keys'

export type Settings = components['schemas']['Settings']
export type UpdateSettingsRequest = components['schemas']['UpdateSettingsRequest']
export type TypeDefinition = components['schemas']['TypeDefinition']
export type TypeField = components['schemas']['TypeField']
export type CreateTypeFieldRequest = components['schemas']['CreateTypeFieldRequest']

// Type definitions and fields have their own typed ETags ("k-N" and "kf-N").
const typeMatch = (version: number) => ({ 'If-Match': `"k-${version}"` })
const fieldMatch = (version: number) => ({ 'If-Match': `"kf-${version}"` })

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
    select: withoutBookkeeping,
    // The list itself is still nullable in the contract (api-v1.0.1 types `GET /types` as
    // `TypeDefinition[] | null`): an absent list is no types.
    queryFn: async ({ signal }) => (await unwrap(api.GET('/api/v1/types', { signal }))) ?? [],
  })
}

function useTypeMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      // A definition changes the fields rendered by items and rows. Deleting a field additionally
      // strips stored metadata and may reset list sort defaults on the server.
      await Promise.all([
        client.invalidateQueries({ queryKey: typeKeys.types }),
        invalidateContent(client),
      ])
    },
  })
}

export function useCreateTypeField() {
  return useTypeMutation(({ type, body }: { type: TypeDefinition; body: CreateTypeFieldRequest }) =>
    unwrap(
      api.POST('/api/v1/types/{key}/fields', {
        params: { path: { key: type.key }, header: typeMatch(type.version) },
        body,
      }),
    ),
  )
}

export function useRenameTypeField() {
  return useTypeMutation(
    ({ type, field, label }: { type: TypeDefinition; field: TypeField; label: string }) =>
      unwrap(
        api.PATCH('/api/v1/types/{key}/fields/{fieldKey}', {
          params: {
            path: { key: type.key, fieldKey: field.key },
            header: fieldMatch(field.version),
          },
          body: { label },
        }),
      ),
  )
}

export function useDeleteTypeField() {
  return useTypeMutation(async ({ type, field }: { type: TypeDefinition; field: TypeField }) =>
    unwrap(
      api.DELETE('/api/v1/types/{key}/fields/{fieldKey}', {
        params: {
          path: { key: type.key, fieldKey: field.key },
          header: fieldMatch(field.version),
        },
      }),
    ),
  )
}

export function usePreviewTypeFieldDelete() {
  return useMutation({
    mutationFn: ({ type, field }: { type: TypeDefinition; field: TypeField }) =>
      unwrap(
        api.GET('/api/v1/types/{key}/fields/{fieldKey}', {
          params: { path: { key: type.key, fieldKey: field.key } },
        }),
      ),
  })
}

export function useReorderTypeFields() {
  return useTypeMutation(({ type, keys }: { type: TypeDefinition; keys: string[] }) =>
    api.PUT('/api/v1/types/{key}/fields/order', {
      params: { path: { key: type.key }, header: typeMatch(type.version) },
      body: { keys },
    }),
  )
}

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
