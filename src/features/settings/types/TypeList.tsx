import type { TypeDefinition } from '../api'
import { TypeRow } from './TypeRow'

export function TypeList({
  types,
  selectedKey,
  onSelect,
}: {
  types: TypeDefinition[]
  selectedKey: string | null
  onSelect: (key: string) => void
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 sm:w-52 sm:shrink-0">
      <div className="flex flex-col gap-1" role="list" aria-label="Types">
        {types.map((type) => (
          <div role="listitem" key={type.key}>
            <TypeRow
              type={type}
              selected={selectedKey === type.key}
              onSelect={() => onSelect(type.key)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
