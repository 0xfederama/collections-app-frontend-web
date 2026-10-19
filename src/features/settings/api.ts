import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { components } from '../../generated/schema'
import { api, ifMatch, unwrap } from '../../lib/api'
import { invalidateContent } from '../invalidateContent'

export type Settings = components['schemas']['Settings']
export type UpdateSettingsRequest = components['schemas']['UpdateSettingsRequest']
export type KindDefinition = components['schemas']['KindDefinition']
export type KindField = components['schemas']['KindField']
export type CreateKindRequest = components['schemas']['CreateKindRequest']
export type CreateKindFieldRequest = components['schemas']['CreateKindFieldRequest']
export type UpdateKindRequest = components['schemas']['UpdateKindRequest']

export const settingsKeys = { settings: ['settings'] as const }
export const kindKeys = { kinds: ['kinds'] as const }

// Kind definitions and fields have their own typed ETags ("k-N" and "kf-N").
const kindMatch = (version: number) => ({ 'If-Match': `"k-${version}"` })
const fieldMatch = (version: number) => ({ 'If-Match': `"kf-${version}"` })

// Provider bookkeeping (TMDB id, lookup switch) lives in item metadata but is never user-facing:
// not an editable field, and never pinnable, sortable or filterable (contract: pinned_fields).
const BOOKKEEPING_FIELDS = new Set(['tmdb_id', 'lookup_disabled'])
const withoutBookkeeping = (kinds: KindDefinition[]): KindDefinition[] =>
  kinds.map((kind) => ({
    ...kind,
    fields: kind.fields.filter((field) => !BOOKKEEPING_FIELDS.has(field.key)),
  }))

export function useKinds() {
  return useQuery({
    queryKey: kindKeys.kinds,
    select: withoutBookkeeping,
    queryFn: ({ signal }) => unwrap(api.GET('/api/v1/kinds', { signal })),
  })
}

function useKindMutation<TVars, TData>(mutationFn: (vars: TVars) => Promise<TData>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      // A definition changes the fields rendered by items and rows. Deleting a field additionally
      // strips stored metadata and may reset list pins/sort defaults on the server.
      await Promise.all([
        client.invalidateQueries({ queryKey: kindKeys.kinds }),
        invalidateContent(client),
      ])
    },
  })
}

export function useCreateKind() {
  return useKindMutation((body: CreateKindRequest) => unwrap(api.POST('/api/v1/kinds', { body })))
}

export function useUpdateKind() {
  return useKindMutation(({ kind, patch }: { kind: KindDefinition; patch: UpdateKindRequest }) =>
    unwrap(
      api.PATCH('/api/v1/kinds/{key}', {
        params: { path: { key: kind.key }, header: kindMatch(kind.version) },
        body: patch,
      }),
    ),
  )
}

export function useDeleteKind() {
  return useKindMutation(async (kind: KindDefinition) => {
    await api.DELETE('/api/v1/kinds/{key}', {
      params: { path: { key: kind.key }, header: kindMatch(kind.version) },
    })
  })
}

export function useCreateKindField() {
  return useKindMutation(({ kind, body }: { kind: KindDefinition; body: CreateKindFieldRequest }) =>
    unwrap(
      api.POST('/api/v1/kinds/{key}/fields', {
        params: { path: { key: kind.key }, header: kindMatch(kind.version) },
        body,
      }),
    ),
  )
}

export function useRenameKindField() {
  return useKindMutation(
    ({ kind, field, label }: { kind: KindDefinition; field: KindField; label: string }) =>
      unwrap(
        api.PATCH('/api/v1/kinds/{key}/fields/{fieldKey}', {
          params: {
            path: { key: kind.key, fieldKey: field.key },
            header: fieldMatch(field.version),
          },
          body: { label },
        }),
      ),
  )
}

export function useDeleteKindField() {
  return useKindMutation(async ({ kind, field }: { kind: KindDefinition; field: KindField }) =>
    unwrap(
      api.DELETE('/api/v1/kinds/{key}/fields/{fieldKey}', {
        params: {
          path: { key: kind.key, fieldKey: field.key },
          header: fieldMatch(field.version),
        },
      }),
    ),
  )
}

export function usePreviewKindFieldDelete() {
  return useMutation({
    mutationFn: ({ kind, field }: { kind: KindDefinition; field: KindField }) =>
      unwrap(
        api.GET('/api/v1/kinds/{key}/fields/{fieldKey}', {
          params: { path: { key: kind.key, fieldKey: field.key } },
        }),
      ),
  })
}

export function useReorderKindFields() {
  return useKindMutation(({ kind, keys }: { kind: KindDefinition; keys: string[] }) =>
    api.PUT('/api/v1/kinds/{key}/fields/order', {
      params: { path: { key: kind.key }, header: kindMatch(kind.version) },
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
