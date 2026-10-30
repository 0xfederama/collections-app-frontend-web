import type { HTMLAttributes } from 'react'
import { cx } from '../../lib/cx'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds the hover lift. Use when the whole card is a link target. */
  interactive?: boolean
}

export function Card({ interactive, className, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        'rounded-lg border border-border bg-surface-raised',
        interactive &&
          'transition-[transform,border-color] hover:-translate-y-px hover:border-text-muted active:translate-y-0',
        className,
      )}
      {...rest}
    />
  )
}
