import type { ReactNode } from 'react'
import type { LucideIcon } from './icons'

export interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  /** Primary action, usually a Button. */
  action?: ReactNode
  headingLevel?: 'h1' | 'h2' | 'h3'
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  headingLevel: Heading = 'h2',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-lg bg-accent-tint text-accent-text">
        <Icon aria-hidden className="size-7" />
      </span>
      <Heading className="font-display text-section">{title}</Heading>
      <p className="max-w-sm text-ui text-text-muted">{description}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
