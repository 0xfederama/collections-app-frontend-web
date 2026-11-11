/** The shape both `Me` and `User` share; what labels and lookups need. */
export interface UserLike {
  id: string
  email: string
  name: string | null
}

/** What to show for a person: the name when there is one, else the e-mail. */
export function userLabel(user: Pick<UserLike, 'name' | 'email'>): string {
  const name = user.name?.trim()
  return name ? name : user.email
}

/** The user with `id`, or `undefined` (unknown id, or the users are not loaded yet). */
export function findUser<T extends { id: string }>(
  users: readonly T[] | undefined,
  id: string | null | undefined,
): T | undefined {
  if (!users || !id) return undefined
  return users.find((user) => user.id === id)
}
