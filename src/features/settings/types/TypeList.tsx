import { Plus } from '../../../components/ui/icons'
import type { TypeDefinition } from '../api'
import { TypeRow } from './TypeRow'

export function TypeList({
  types,
  selectedKey,
  onSelect,
  onCreate,
}: {
  types: TypeDefinition[]
  selectedKey: string | null
  onSelect: (key: string) => void
  onCreate: () => void
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
      <button
        type="button"
        title="New type"
        onClick={onCreate}
        className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-text-muted hover:bg-fill hover:text-text focus-visible:outline-2 focus-visible:outline-focus-ring"
      >
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-sm bg-fill">
          <Plus className="size-4" />
        </span>
        <span className="min-w-0 flex-1 text-ui font-medium">New type</span>
      </button>
    </div>
  )
}
