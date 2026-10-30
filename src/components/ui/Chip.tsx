import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/cx'

export type ChipTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'

const toneClasses: Record<ChipTone, string> = {
  neutral: 'border-border bg-fill text-text',
  accent: 'border-accent-tint bg-accent-tint text-accent-text',
  success: 'border-success-border bg-success-bg text-success-text',
  warning: 'border-warning-border bg-warning-bg text-warning-text',
  danger: 'border-danger-border bg-danger-bg text-danger-text',
}

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: ChipTone
  /** Optional decorative icon; the text label is always rendered so state is never color alone. */
  icon?: ReactNode
}

export function Chip({ tone = 'neutral', icon, className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-secondary font-medium whitespace-nowrap [&_svg]:size-3.5',
        toneClasses[tone],
        className,
      )}
      {...rest}
    >
      {icon && (
        <span aria-hidden className="inline-flex">
          {icon}
        </span>
      )}
      {children}
    </span>
  )
}
