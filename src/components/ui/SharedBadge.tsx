import type { ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { Users } from './icons'

export interface SharedBadgeProps {
  /** Whether the icon belongs to a shared folder. When false the children render unchanged. */
  shared: boolean
  /** The icon the mark sits on. */
  children: ReactNode
  className?: string
}

/**
 * The two-person mark at the bottom right of a shared folder's icon (F-027, every surface of both
 * users). Decorative: the row's name carries the word "shared" for assistive tech, so the mark is
 * never the only cue.
 */
export function SharedBadge({ shared, children, className }: SharedBadgeProps) {
  if (!shared) return <>{children}</>
  return (
    <span className={cx('relative inline-grid shrink-0 place-items-center', className)}>
      {children}
      <span
        data-testid="shared-badge"
        aria-hidden
        className="absolute -right-1.5 -bottom-1.5 grid size-4 place-items-center rounded-full border border-border bg-surface-raised text-text-muted"
      >
        <Users className="size-2.5" />
      </span>
    </span>
  )
}
