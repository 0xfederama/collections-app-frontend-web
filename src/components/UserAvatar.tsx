import { useState } from 'react'
import { cx } from '../lib/cx'
import { firstLetter } from '../lib/text'

export interface UserAvatarProps {
  name?: string | null
  email?: string | null
  avatarUrl?: string | null
  /** Side in px. */
  size?: number
  className?: string
}

const isHttps = (url: string | null | undefined): url is string => {
  if (!url) return false
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * A person's picture. The image is decorative (`alt=""`): the name is always shown beside it or
 * given by the parent. Only https URLs are loaded, without a referrer; a missing, non-https or
 * broken URL becomes the letter tile.
 */
export function UserAvatar({ name, email, avatarUrl, size = 40, className }: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const style = { width: size, height: size }
  if (isHttps(avatarUrl) && failedUrl !== avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        style={style}
        onError={() => setFailedUrl(avatarUrl)}
        className={cx('shrink-0 rounded-full bg-fill object-cover', className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      data-testid="user-avatar-fallback"
      style={{ ...style, fontSize: Math.round(size * 0.42) }}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-fill font-semibold text-text-muted',
        className,
      )}
    >
      {firstLetter(name?.trim() || email || '')}
    </span>
  )
}
