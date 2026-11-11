// Fixed user for fixtures and dev fakes (F-027): the owner of every top-level folder and list.
export const OWNER_USER_ID = '00000000-0000-4000-8000-000000000001'

export const OWNER_USER = {
  id: OWNER_USER_ID,
  email: 'owner@dev.test',
  name: 'Owner',
  avatar_url: null,
} as const

export const OWNER_ME = { ...OWNER_USER, dev_identities: null } as const

/** Owner of a new folder or list: the fixture owner at the top level, null when nested. */
export const ownerFor = (parentId: string | null): string | null =>
  parentId === null ? OWNER_USER_ID : null
