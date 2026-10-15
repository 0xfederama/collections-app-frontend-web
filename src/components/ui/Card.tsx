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
        'rounded-lg bg-surface shadow-sm',
        interactive &&
          'transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-lg active:translate-y-0 active:shadow-sm',
        className,
      )}
      {...rest}
    />
  )
}
