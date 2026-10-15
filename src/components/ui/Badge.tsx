import { cx } from '../../lib/cx'
import { kindIcons, kindLabels, type ItemKind } from './icons'

export interface BadgeProps {
  kind: ItemKind
  className?: string
}

/** Item kind marker: icon plus the kind name (UI_SPEC §4). */
export function Badge({ kind, className }: BadgeProps) {
  const Icon = kindIcons[kind]
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full bg-fill px-2.5 py-0.5 text-xs font-medium text-text',
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {kindLabels[kind]}
    </span>
  )
}
