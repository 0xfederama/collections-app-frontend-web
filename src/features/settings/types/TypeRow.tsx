import { ListIconMark } from '../../lists'
import { Lock } from '../../../components/ui/icons'
import { cx } from '../../../lib/cx'
import type { TypeDefinition } from '../api'

export function TypeRow({
  type,
  selected,
  onSelect,
}: {
  type: TypeDefinition
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      aria-current={selected ? 'true' : undefined}
      onClick={onSelect}
      className={cx(
        'flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-focus-ring',
        selected ? 'bg-accent-tint text-text' : 'hover:bg-fill',
      )}
    >
      <ListIconMark
        icon={type.default_icon}
        type={type.key}
        className="size-9"
        iconClassName="size-4"
      />
      <span className="min-w-0 flex-1 font-display text-row break-words">{type.name}</span>
      {type.is_locked && (
        <>
          <Lock aria-hidden className="size-3.5 shrink-0 text-text-muted" />
          <span className="sr-only">Built in · locked</span>
        </>
      )}
    </button>
  )
}
