import { Button } from '../../../components/ui'
import { useSortableRow } from '../../../components/ui/sortable'
import { cx } from '../../../lib/cx'
import type { TypeField } from '../api'
import { fieldTypeWord } from './model'

export function FieldRow({
  field,
  index,
  size,
  onRename,
  onDelete,
}: {
  field: TypeField
  index: number
  size: number
  onRename: () => void
  onDelete: () => void
}) {
  const { ref, isDragging, a11y } = useSortableRow(
    field.key,
    field.is_locked ? undefined : { group: 'type-fields', index, size, label: field.label },
  )
  return (
    <div
      ref={ref}
      role="listitem"
      tabIndex={field.is_locked ? undefined : 0}
      aria-label={`${field.label}, ${field.type === 'boolean' ? 'yes or no' : fieldTypeWord(field.type)}`}
      aria-describedby={a11y['aria-describedby']}
      className={cx(
        'flex min-h-14 flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 focus-visible:outline-2 focus-visible:outline-focus-ring',
        isDragging && 'opacity-50',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium break-words">{field.label}</span>
        <span className="text-xs text-text-muted">
          {field.key} · {field.type === 'boolean' ? 'yes / no' : fieldTypeWord(field.type)}
          {field.is_locked ? ' · built in, read only' : ''}
        </span>
      </span>
      {!field.is_locked && (
        <>
          <Button variant="ghost" size="sm" onClick={onRename} aria-label={`Rename ${field.label}`}>
            Rename
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} aria-label={`Delete ${field.label}`}>
            Delete
          </Button>
        </>
      )}
      {field.is_locked && <span className="text-xs text-text-muted">Locked</span>}
    </div>
  )
}
