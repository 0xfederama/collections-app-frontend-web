import { findUser, userLabel, type User } from '../../account'
import type { Folder } from '../api'

export interface Person {
  id: string
  label: string
  /** `undefined` when the user list has no such person (yet). */
  user: User | undefined
  isOwner: boolean
}

export const UNKNOWN_PERSON = 'Unknown person'

/** The owner first, then each member in server order, resolved against `GET /users`. */
export function peopleWithAccess(folder: Folder, users: readonly User[] | undefined): Person[] {
  const ids = [
    ...(folder.owner_user_id ? [folder.owner_user_id] : []),
    ...folder.member_user_ids.filter((id) => id !== folder.owner_user_id),
  ]
  return ids.map((id) => {
    const user = findUser(users, id)
    return {
      id,
      user,
      label: user ? userLabel(user) : UNKNOWN_PERSON,
      isOwner: id === folder.owner_user_id,
    }
  })
}
