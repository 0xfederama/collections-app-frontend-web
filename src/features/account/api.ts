import { useQuery } from '@tanstack/react-query'
import { accountKeys } from '../../data/keys'
import type { components } from '../../generated/schema'
import { api, unwrap } from '../../lib/api'

export type Me = components['schemas']['Me']
export type User = components['schemas']['User']

/** The signed-in user (`GET /me`). */
export function useMe() {
  return useQuery({
    queryKey: accountKeys.me,
    queryFn: ({ signal }) => unwrap(api.GET('/api/v1/me', { signal })),
  })
}

/** Everyone in the workspace (`GET /users`): names for sharing and "updated by". */
export function useUsers() {
  return useQuery({
    queryKey: accountKeys.users,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => (await unwrap(api.GET('/api/v1/users', { signal }))).data ?? [],
  })
}
