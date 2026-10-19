import { cx } from '../../lib/cx'
import { List, NO_TYPE_LABEL, typeIcons, typeLabels, type ItemType } from './icons'

export interface BadgeProps {
  type: ItemType
  className?: string
}

/** Item type marker: icon plus the type name (UI_SPEC §4). */
export function Badge({ type, className }: BadgeProps) {
  const Icon = (type === null ? undefined : typeIcons[type]) ?? List
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full bg-fill px-2.5 py-0.5 text-xs font-medium text-text',
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {type === null ? NO_TYPE_LABEL : (typeLabels[type] ?? type.replaceAll('_', ' '))}
    </span>
  )
}
