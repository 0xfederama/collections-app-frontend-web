// Fixed user for fixtures and dev fakes (F-027): the owner of every top-level folder and list.
export const OWNER_USER_ID = '00000000-0000-4000-8000-000000000001'

const OWNER_USER = {
  id: OWNER_USER_ID,
  email: 'owner@dev.test',
  name: 'Owner',
  avatar_url: null,
} as const

// A second person to share with (the member id the fixtures already carry).
export const MEMBER_USER_ID = '00000000-0000-4000-8000-000000000002'

const MEMBER_USER = {
  id: MEMBER_USER_ID,
  email: 'alice@dev.test',
  name: 'Alice',
  avatar_url: null,
} as const

/** Everyone who has "signed in once": what `GET /users` lists and a share-by-email can find. */
export const KNOWN_USERS = [OWNER_USER, MEMBER_USER]

export const OWNER_ME = { ...OWNER_USER, dev_identities: null } as const

/** Owner of a new folder or list: the fixture owner at the top level, null when nested. */
export const ownerFor = (parentId: string | null): string | null =>
  parentId === null ? OWNER_USER_ID : null
