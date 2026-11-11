import { UserAvatar } from '../../components/UserAvatar'
import { cx } from '../../lib/cx'
import type { User } from './api'
import { userLabel } from './model/users'

export interface UserMarkProps {
  user: Pick<User, 'name' | 'email' | 'avatar_url'>
  /** Avatar side in px. */
  size?: number
  className?: string
}

/** A person as a small avatar and their label (name, else e-mail), for "by …" lines (F-027 W6). */
export function UserMark({ user, size = 20, className }: UserMarkProps) {
  return (
    <span
      className={cx('inline-flex min-w-0 max-w-full items-center gap-1.5 align-middle', className)}
    >
      <UserAvatar name={user.name} email={user.email} avatarUrl={user.avatar_url} size={size} />
      <span className="truncate">{userLabel(user)}</span>
    </span>
  )
}
