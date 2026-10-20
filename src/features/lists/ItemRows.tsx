import { cx } from '../../lib/cx'
import type { DisplayMode, ItemSummary } from './api'
import type { ItemType, TypeDefinition } from '../items'
import { ItemEntry } from './ItemEntry'
import type { PinnedKeys } from './pinned'
import { useSortableRow } from '../../components/ui/sortable'

/** The not-yet-created item: dashed and muted, so it never reads as a saved row (nor as Quick add). */
export function DraftRow({ mode }: { mode: DisplayMode }) {
  return (
    <li
      aria-label="New item (draft)"
      aria-current="true"
      className={cx(
        'flex items-center gap-3 rounded-lg border border-dashed border-accent bg-fill/40 p-3 text-text-muted',
        mode === 'grid' && 'aspect-4/3 flex-col justify-center text-center',
      )}
    >
      <span className="rounded-sm bg-fill px-1.5 py-0.5 text-xs font-medium text-text-muted">
        Draft
      </span>
      <span className="italic">Untitled item</span>
    </li>
  )
}

export function SortableEntry({
  item,
  index,
  size,
  mode,
  type,
  definition,
  pinned,
  search,
  onOpen,
  onMoveBy,
}: {
  item: ItemSummary
  index: number
  size: number
  mode: DisplayMode
  type: ItemType
  definition: TypeDefinition
  pinned: PinnedKeys
  search: string
  onOpen: () => void
  onMoveBy: (delta: -1 | 1) => void
}) {
  const { ref, isDragging, a11y } = useSortableRow(item.id, {
    group: 'items',
    index,
    size,
    label: item.title,
  })
  return (
    <ItemEntry
      item={item}
      mode={mode}
      type={type}
      definition={definition}
      pinned={pinned}
      search={search}
      onOpen={onOpen}
      reorder={{
        rowRef: ref,
        rowProps: a11y,
        isDragging,
        canMoveUp: index > 0,
        canMoveDown: index < size - 1,
        onMoveBy,
      }}
    />
  )
}
