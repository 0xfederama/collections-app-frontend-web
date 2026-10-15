import {
  Accessibility,
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
  type Draggable,
} from '@dnd-kit/dom'
import { DragDropProvider } from '@dnd-kit/react'
import { isSortable, useSortable } from '@dnd-kit/react/sortable'
import { createContext, useContext, useId, useRef, useState, type ReactNode } from 'react'

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
  'Press Space to pick the row up. Use the arrow keys to move it, Space or Enter to drop it, Escape to cancel.'

/** Pointer distance (px) before a mouse or pen press becomes a drag; below it the press is a click. */
const DRAG_DISTANCE = 6
/** Touch needs a press-and-hold, so a swipe still scrolls the page. `tolerance` is the finger drift allowed while holding. */
const TOUCH_HOLD = { value: 250, tolerance: 8 }

const CONTROLS = 'button, input, select, textarea, [contenteditable="true"], [role="menuitem"]'

// The whole row is the activator, so a press on a link inside it (the title, a list name) must start
// a drag too. Only real controls (menu button, inputs) keep their own press.
const pointerBlockedByControl = (event: PointerEvent, source: Draggable) => {
  const target = event.target
  const row = source.element
  if (!(target instanceof Element) || !row) return false
  const control = target.closest(CONTROLS)
  return !!control && control !== row && row.contains(control)
}

// Space picks up when the row itself, or the link inside it, has focus. Enter is left alone: it
// follows the link and selects the tree row.
const keyboardBlocked = (event: KeyboardEvent, source: Draggable) => {
  const target = event.target
  if (target === source.element) return false
  return !(target instanceof HTMLAnchorElement && !!source.element?.contains(target))
}

const sensors = [
  PointerSensor.configure({
    activationConstraints: (event) =>
      event.pointerType === 'touch'
        ? [new PointerActivationConstraints.Delay(TOUCH_HOLD)]
        : [new PointerActivationConstraints.Distance({ value: DRAG_DISTANCE })],
    preventActivation: pointerBlockedByControl,
  }),
  KeyboardSensor.configure({
    keyboardCodes: {
      start: ['Space'],
      cancel: ['Escape'],
      end: ['Space', 'Enter', 'Tab'],
      up: ['ArrowUp'],
      down: ['ArrowDown'],
      left: ['ArrowLeft'],
      right: ['ArrowRight'],
    },
    preventActivation: keyboardBlocked,
  }),
]

const rowOf = (source: unknown): { label: string; position: number; size: number } | null => {
  if (!source || !isSortable(source as never)) return null
  const { data, index } = source as { data?: RowData; index: number }
  return data ? { label: data.label, position: index + 1, size: data.size } : null
}

const indexOf = (source: unknown) =>
  source && isSortable(source as never) ? (source as { index: number }).index : -1

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

// Browsers differ in where the click that ends a mouse drag lands (dnd-kit captures the pointer on
// <body>, so most send it there). Whichever element gets it, a drag must never open a link or select
// a row, so the click is swallowed from the drag's start until just after it ends.
let stopSwallowing: (() => void) | undefined
const startSwallowingClick = () => {
  if (stopSwallowing) return
  const swallow = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
  }
  window.addEventListener('click', swallow, true)
  stopSwallowing = () => {
    window.removeEventListener('click', swallow, true)
    window.removeEventListener('pointerdown', stopSwallowing!, true)
    stopSwallowing = undefined
  }
}
const stopSwallowingClick = () => {
  const stop = stopSwallowing
  if (!stop) return
  // The drag's own click comes right after it ends; a new press means none is coming.
  window.addEventListener('pointerdown', stop, true)
  setTimeout(stop, 100)
}

const withoutAccessibility = (defaults: readonly unknown[]) =>
  defaults.filter((plugin) => plugin !== Accessibility) as never

// dnd-kit's own Accessibility plugin is replaced: it stamps `role="button"`, `aria-pressed` and
// `aria-grabbed` on the draggable element, which is now a whole row (a treeitem, or a listitem
// that holds links), and axe rejects those (aria-allowed-attr, aria-allowed-role, nested-interactive).
// The instructions and the live announcements below are the same, without touching the row's role.
const SortableA11yContext = createContext<string | undefined>(undefined)

export function SortableProvider({
  onMove,
  children,
}: {
  onMove: (move: SortableMove) => void
  children: ReactNode
}) {
  const instructionsId = useId()
  const [announcement, setAnnouncement] = useState('')
  // dragover also fires once right after the pick-up; only a changed position is news.
  const lastIndex = useRef<number>(-1)
  // dnd-kit can fire its events while React is committing (an insertion effect), where a state
  // update is not allowed: hand it over in a microtask.
  const announce = (text: string | null | undefined) =>
    queueMicrotask(() => setAnnouncement(text ?? ''))
  return (
    <SortableA11yContext.Provider value={instructionsId}>
      <DragDropProvider
        sensors={sensors}
        plugins={withoutAccessibility}
        onDragStart={(event) => {
          lastIndex.current = indexOf(event.operation.source)
          announce(announcements.dragstart(event))
          // Only a pointer drag is followed by a click; a keyboard drag never is.
          if (event.operation.activatorEvent?.type.startsWith('pointer')) startSwallowingClick()
        }}
        onDragOver={(event) => {
          const index = indexOf(event.operation.source)
          if (index === lastIndex.current) return
          lastIndex.current = index
          announce(announcements.dragover(event))
        }}
        onDragEnd={(event) => {
          stopSwallowingClick()
          announce(announcements.dragend(event))
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
      <span id={instructionsId} hidden>
        {INSTRUCTIONS}
      </span>
      <div role="status" aria-live="assertive" className="sr-only">
        {announcement}
      </div>
    </SortableA11yContext.Provider>
  )
}

/**
 * Makes a row sortable. Without a `slot` the row is inert. `ref` goes on the row: the whole row is
 * the drag handle (no grip), and the keyboard sensor listens on the row itself.
 */
export function useSortableRow(id: string, slot: SortableSlot | undefined) {
  const { ref, isDragging } = useSortable({
    id,
    index: slot?.index ?? 0,
    group: slot?.group,
    type: slot?.group,
    accept: slot?.group,
    disabled: !slot,
    data: { label: slot?.label ?? '', size: slot?.size ?? 0 } satisfies RowData,
  })
  const instructionsId = useContext(SortableA11yContext)
  return {
    ref,
    isDragging,
    /** Props for the row element: the keyboard instructions, read as its description. */
    a11y: slot ? { 'aria-describedby': instructionsId } : {},
  }
}
