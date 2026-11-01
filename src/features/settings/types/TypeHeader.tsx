import type { TypeDefinition } from '../api'

export function TypeHeader({ selected }: { selected: TypeDefinition }) {
  return (
    <div className="min-w-0">
      <h3 className="font-display text-section break-words">{selected.name}</h3>
      <p className="text-secondary text-text-muted">Built in type</p>
    </div>
  )
}
