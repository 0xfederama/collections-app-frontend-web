import { List as ListIcon } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import { builtinListIcon, defaultListIcon, parseListIcon } from './iconModel'
import type { ListIconColor } from './iconModel'
import type { ItemKind } from '../items/api'

const ICON_COLOR_CLASSES: Record<ListIconColor, string> = {
  red: 'text-list-icon-red',
  orange: 'text-list-icon-orange',
  amber: 'text-list-icon-amber',
  green: 'text-list-icon-green',
  teal: 'text-list-icon-teal',
  blue: 'text-list-icon-blue',
  indigo: 'text-list-icon-indigo',
  purple: 'text-list-icon-purple',
  pink: 'text-list-icon-pink',
  gray: 'text-list-icon-gray',
}

export function ListIconMark({
  icon,
  iconColor,
  kind = 'generic',
  className,
  iconClassName,
}: {
  icon?: string | null
  iconColor?: ListIconColor | null
  kind?: ItemKind
  className?: string
  iconClassName?: string
}) {
  const parsed = parseListIcon(icon)
  const Builtin = parsed.builtin ? builtinListIcon(parsed.builtin)?.Icon : undefined
  const Glyph = Builtin ?? defaultListIcon(kind) ?? ListIcon
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid shrink-0 place-items-center rounded-md bg-fill',
        iconColor && Builtin && ICON_COLOR_CLASSES[iconColor],
        className,
      )}
    >
      {parsed.emoji ? (
        <span className={iconClassName}>{parsed.emoji}</span>
      ) : (
        <Glyph className={cx('text-current', iconClassName)} />
      )}
    </span>
  )
}
