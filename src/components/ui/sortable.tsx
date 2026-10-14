import { Accessibility } from '@dnd-kit/dom'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import type { ReactNode } from 'react'

/*
 * The one place that imports dnd-kit (D-061). `@dnd-kit/react` is pre-1.0, so an API break must
 * stay inside this file: the rest of the app only sees `SortableProvider`, `useSortableRow` and
 * the plain `SortableSlot` / `SortableMove` shapes below.
 */

/** Where a row sits in its sortable group. Rows in different groups never swap places. */
export interface SortableSlot {
  /** Rows only reorder among rows with the same group key. */
  group: string
  /** Position inside the group, from 0. */
  index: number
  /** Number of rows in the group. */
  size: number
  /** Human name, used in screen reader announcements. */
  label: string
}

/** A finished drag: the row `id` went from position `from` to `to` inside `group`. */
export interface SortableMove {
  id: string
  group: string
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
  'Press Space or Enter on the drag handle to pick the row up. Use the arrow keys to move it, Space or Enter to drop it, Escape to cancel.'

const rowOf = (source: unknown): { label: string; position: number; size: number } | null => {
  if (!source || !isSortable(source as never)) return null
  const { data, index } = source as { data?: RowData; index: number }
  return data ? { label: data.label, position: index + 1, size: data.size } : null
}

// Announcements replace dnd-kit's defaults (which would read out raw ids). `dragover` fires every
// time the row passes a neighbour, so it reports the new position.
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
        onMove({
          id: String(source.id),
          group: String(source.group),
          from: initialIndex,
          to: index,
        })
      }}
    >
      {children}
    </DragDropProvider>
  )
}

/**
 * Makes a row sortable. Without a `slot` the row is inert. `ref` goes on the row, `handleRef` on
 * the focusable drag handle, which is what the keyboard sensor listens to.
 */
export function useSortableRow(id: string, slot: SortableSlot | undefined) {
  const { ref, handleRef, isDragging } = useSortable({
    id,
    index: slot?.index ?? 0,
    group: slot?.group,
    type: slot?.group,
    accept: slot?.group,
    disabled: !slot,
    data: { label: slot?.label ?? '', size: slot?.size ?? 0 } satisfies RowData,
  })
  return { ref, handleRef, isDragging }
}
