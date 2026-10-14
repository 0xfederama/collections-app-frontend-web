import { Accessibility } from '@dnd-kit/dom'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import type { ReactNode } from 'react'

/*
 * The one place in the list view that imports dnd-kit (D-061). `@dnd-kit/react` is pre-1.0, so an
 * API break must stay inside this file: the rest of the feature only sees `SortableProvider`,
 * `useSortableRow` and the plain `SortableMove` shape. The names match W-05's
 * `components/ui/sortable.tsx`, so once both are merged this file can be swapped for that one.
 */

/** A finished drag: the row `id` went from position `from` to `to`. */
export interface SortableMove {
  id: string
  from: number
  to: number
}

export const arrayMove = <T,>(items: readonly T[], from: number, to: number): T[] => {
  const next = [...items]
  const [moved] = next.splice(from, 1)
  if (moved !== undefined) next.splice(to, 0, moved)
  return next
}

interface RowData {
  label: string
  size: number
}

const INSTRUCTIONS =
  'Press Space or Enter on the drag handle to pick the item up. Use the arrow keys to move it, Space or Enter to drop it, Escape to cancel.'

const rowOf = (source: unknown): { label: string; position: number; size: number } | null => {
  if (!source || !isSortable(source as never)) return null
  const { data, index } = source as { data?: RowData; index: number }
  return data ? { label: data.label, position: index + 1, size: data.size } : null
}

// Replace dnd-kit's default announcements (which read out raw ids). `dragover` fires each time the
// item passes a neighbour, so it reports the new position.
const announcements = {
  dragstart: ({ operation }: { operation: { source: unknown } }) => {
    const row = rowOf(operation.source)
    return row && `Picked up ${row.label}. Position ${row.position} of ${row.size}.`
  },
  dragover: ({ operation }: { operation: { source: unknown } }) => {
    const row = rowOf(operation.source)
    return row && `${row.label}, position ${row.position} of ${row.size}.`
  },
  dragend: ({ operation, canceled }: { operation: { source: unknown }; canceled: boolean }) => {
    const row = rowOf(operation.source)
    if (!row) return undefined
    return canceled
      ? `Move cancelled. ${row.label} is back in its place.`
      : `Dropped ${row.label} at position ${row.position} of ${row.size}.`
  },
}

export function SortableProvider({
  onMove,
  children,
}: {
  onMove: (move: SortableMove) => void
  children: ReactNode
}) {
  return (
    <DragDropProvider
      plugins={(defaults) =>
        defaults.map((plugin) =>
          plugin === Accessibility
            ? Accessibility.configure({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dnd-kit's event types are generic over the manager
                announcements: announcements as any,
                screenReaderInstructions: { draggable: INSTRUCTIONS },
                debounce: 150,
              })
            : plugin,
        )
      }
      onDragEnd={(event) => {
        const source = event.operation.source
        if (event.canceled || !source || !isSortable(source)) return
        const { initialIndex, index } = source
        if (initialIndex === index) return
        onMove({ id: String(source.id), from: initialIndex, to: index })
      }}
    >
      {children}
    </DragDropProvider>
  )
}

/**
 * Makes an item sortable. `ref` goes on the row and `handleRef` on the focusable drag handle,
 * which is what the pointer and keyboard sensors listen to.
 */
export function useSortableRow(id: string, index: number, label: string, size: number) {
  const { ref, handleRef, isDragging } = useSortable({
    id,
    index,
    data: { label, size } satisfies RowData,
  })
  return { ref, handleRef, isDragging }
}
