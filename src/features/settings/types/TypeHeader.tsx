import { Button } from '../../../components/ui'
import type { TypeDefinition } from '../api'

export function TypeHeader({
  selected,
  deleteDisabled,
  onDelete,
}: {
  selected: TypeDefinition
  deleteDisabled: boolean
  onDelete: () => void
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1 basis-40">
        <h3 className="text-base font-semibold break-words">{selected.name}</h3>
        <p className="text-xs text-text-muted">
          {selected.is_locked ? 'Built in type · settings are read only' : `Key: ${selected.key}`}
        </p>
      </div>
      {!selected.is_locked && (
        <Button variant="danger" size="sm" disabled={deleteDisabled} onClick={onDelete}>
          Delete type
        </Button>
      )}
    </div>
  )
}
