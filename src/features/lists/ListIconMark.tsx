import type { CSSProperties } from 'react'
import { List as ListIcon } from '../../components/ui/icons'
import { cx } from '../../lib/cx'
import { builtinListIcon, defaultListIcon, listIconColors, parseListIcon } from './iconModel'
import type { ListIconColor } from './iconModel'
import type { ItemKind } from '../items/api'

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
      className={cx('grid shrink-0 place-items-center rounded-md bg-fill', className)}
      style={
        iconColor && Builtin ? ({ color: listIconColors[iconColor] } as CSSProperties) : undefined
      }
    >
      {parsed.emoji ? (
        <span className={iconClassName}>{parsed.emoji}</span>
      ) : (
        <Glyph className={cx('text-current', iconClassName)} />
      )}
    </span>
  )
}
