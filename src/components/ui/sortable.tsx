/* eslint-disable max-lines -- the one place that adapts the pre-1.0 @dnd-kit API; splitting it would spread the dnd-kit imports (D-061) */
import {
  Accessibility,
  KeyboardSensor,
  PointerActivationConstraints,
  PointerSensor,
  type Draggable,
} from '@dnd-kit/dom'
import { DragDropProvider, useDragDropManager, useDroppable } from '@dnd-kit/react'
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
  /**
   * Set when the row was dropped onto a container row (a folder) instead of between rows: that row's
   * id, or `null` for the top-level drop zone (`useTopLevelDropZone`).
   */
  into?: string | null
}

/** Makes a row a drop target for "move into": whether it accepts the dragged row, and its name for announcements. */
export interface SortableDropInto {
  accepts: (sourceId: string) => boolean
  label: string
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
  index: number
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
    if (stopSwallowing) window.removeEventListener('pointerdown', stopSwallowing, true)
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

type DroppableInput = Parameters<typeof useDroppable>[0]
type Detector = NonNullable<DroppableInput['collisionDetector']>

// Dropping "into" a container row only counts while the mouse (or finger) is over the middle of the
// row; the top and bottom quarter stay for reordering between rows. Priorities and types are dnd-kit's
// CollisionPriority.Highest (4) and CollisionType.PointerIntersection (2), written as numbers because
// the enums live in a package this app does not depend on directly. A keyboard drag never "drops into":
// its path is the arrow reorder (and the Move dialog).
const INTO_PRIORITY = 4
const POINTER_INTERSECTION = 2
const intoZone: Detector = ({ dragOperation, droppable }) => {
  const pointer = dragOperation.position.current
  const shape = droppable.shape
  if (!pointer || !shape) return null
  if (!dragOperation.activatorEvent?.type.startsWith('pointer')) return null
  const { top, height } = shape.boundingRectangle
  if (!shape.containsPoint(pointer)) return null
  const offset = (pointer.y - top) / height
  if (offset < 0.25 || offset > 0.75) return null
  return { id: droppable.id, value: 1, type: POINTER_INTERSECTION, priority: INTO_PRIORITY }
}

// During a pointer drag, a container row (a folder) swaps places with the dragged row only once the
// pointer is past its far quarter (its bottom quarter when coming from above, its top quarter when
// coming from below). dnd-kit's default swaps as soon as the rows touch, so dragging a folder onto
// the sibling right next to it swapped them before the pointer reached the sibling's middle, and the
// "drop into" zone could never be reached (web 3.1.0).
const SORT_PRIORITY = 2
const farEdge: Detector = ({ dragOperation, droppable }) => {
  const pointer = dragOperation.position.current
  const shape = droppable.shape
  if (!pointer || !shape) return null
  const { top, left, width, height } = shape.boundingRectangle
  if (pointer.x < left || pointer.x > left + width || pointer.y < top || pointer.y > top + height)
    return null
  // Positions at drag start (RowData), stable while dnd-kit reorders the rows under the pointer.
  const from = (dragOperation.source?.data as RowData | undefined)?.index
  const at = (droppable.data as RowData | undefined)?.index
  if (from === undefined || at === undefined) return null
  const hit = { id: droppable.id, value: 1, type: POINTER_INTERSECTION, priority: SORT_PRIORITY }
  // Over its own slot the row stays the target, as with dnd-kit's default.
  if (from === at) return hit
  const offset = (pointer.y - top) / height
  return (from < at ? offset > 0.75 : offset < 0.25) ? hit : null
}

// Only a pointer drag may drop "into" a row: whatever the collision detector said, a keyboard drag reorders.
const dropIntoOf = (target: unknown, activatorEvent?: Event | null): string | null | undefined => {
  if (!activatorEvent?.type.startsWith('pointer')) return undefined
  const into = (target as { data?: { dropInto?: unknown } } | null | undefined)?.data?.dropInto
  return typeof into === 'string' || into === null ? into : undefined
}

// The top-level zone counts anywhere inside it (it is not a row, so there is nothing to reorder around).
const insideZone: Detector = ({ dragOperation, droppable }) => {
  const pointer = dragOperation.position.current
  const shape = droppable.shape
  if (!pointer || !shape || !dragOperation.activatorEvent?.type.startsWith('pointer')) return null
  if (!shape.containsPoint(pointer)) return null
  return { id: droppable.id, value: 1, type: POINTER_INTERSECTION, priority: INTO_PRIORITY }
}

const withoutAccessibility = (defaults: readonly unknown[]) =>
  defaults.filter((plugin) => plugin !== Accessibility) as never

// dnd-kit's own Accessibility plugin is replaced: it stamps `role="button"`, `aria-pressed` and
// `aria-grabbed` on the draggable element, which is now a whole row (a treeitem, or a listitem
// that holds links), and axe rejects those (aria-allowed-attr, aria-allowed-role, nested-interactive).
// The instructions and the live announcements below are the same, without touching the row's role.
const SortableA11yContext = createContext<string | undefined>(undefined)
// The id of the row a pointer drag is moving, or null: the "drop into" zones exist only then, so a
// keyboard drag only reorders.
const PointerDragContext = createContext<string | null>(null)

export function SortableProvider({
  onMove,
  children,
}: {
  onMove: (move: SortableMove) => void
  children: ReactNode
}) {
  const instructionsId = useId()
  const [announcement, setAnnouncement] = useState('')
  const [pointerDrag, setPointerDrag] = useState<string | null>(null)
  // dragover also fires once right after the pick-up; only a changed position is news.
  const lastIndex = useRef<number>(-1)
  // dnd-kit can fire its events while React is committing (an insertion effect), where a state
  // update is not allowed: hand it over in a microtask.
  const announce = (text: string | null | undefined) =>
    queueMicrotask(() => setAnnouncement(text ?? ''))
  return (
    <SortableA11yContext.Provider value={instructionsId}>
      <PointerDragContext.Provider value={pointerDrag}>
        <DragDropProvider
          sensors={sensors}
          plugins={withoutAccessibility}
          onDragStart={(event) => {
            lastIndex.current = indexOf(event.operation.source)
            announce(announcements.dragstart(event))
            const source = event.operation.source
            setPointerDrag(
              source && event.operation.activatorEvent?.type.startsWith('pointer')
                ? String(source.id)
                : null,
            )
            // Only a pointer drag is followed by a click; a keyboard drag never is.
            if (event.operation.activatorEvent?.type.startsWith('pointer')) startSwallowingClick()
          }}
          onDragOver={(event) => {
            const into = dropIntoOf(event.operation.target, event.operation.activatorEvent)
            if (into !== undefined) {
              const label = (event.operation.target?.data as { label?: string } | undefined)?.label
              if (label) announce(`Drop into ${label}.`)
              return
            }
            const index = indexOf(event.operation.source)
            if (index === lastIndex.current) return
            lastIndex.current = index
            announce(announcements.dragover(event))
          }}
          onDragEnd={(event) => {
            stopSwallowingClick()
            setPointerDrag(null)
            announce(announcements.dragend(event))
            const source = event.operation.source
            if (event.canceled || !source || !isSortable(source)) return
            const { initialIndex, index } = source
            const into = dropIntoOf(event.operation.target, event.operation.activatorEvent)
            if (into !== undefined) {
              onMove({
                id: String(source.id),
                group: String(source.group),
                from: initialIndex,
                to: initialIndex,
                into,
              })
              return
            }
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
      </PointerDragContext.Provider>
    </SortableA11yContext.Provider>
  )
}

/**
 * Makes a row sortable. Without a `slot` the row is inert. `ref` goes on the row: the whole row is
 * the drag handle (no grip), and the keyboard sensor listens on the row itself.
 */
export function useSortableRow(
  id: string,
  slot: SortableSlot | undefined,
  dropInto?: SortableDropInto,
) {
  const pointerDrag = useContext(PointerDragContext)
  const { ref, isDragging } = useSortable({
    id,
    collisionDetector: dropInto && pointerDrag !== null ? farEdge : undefined,
    index: slot?.index ?? 0,
    group: slot?.group,
    type: slot?.group,
    accept: slot?.group,
    disabled: !slot,
    data: {
      label: slot?.label ?? '',
      size: slot?.size ?? 0,
      index: slot?.index ?? 0,
    } satisfies RowData,
  })
  // A second droppable on the same row: "drop into". It is separate from the sortable one because the
  // sortable only accepts its own group, so a list could never reach a folder (the F008-W4 bug).
  const into = useDroppable({
    id: `into:${id}`,
    disabled: !dropInto || pointerDrag === null,
    accept: (source) => !!dropInto && dropInto.accepts(String(source.id)),
    collisionDetector: intoZone,
    collisionPriority: INTO_PRIORITY,
    data: { dropInto: id, label: dropInto?.label ?? '' },
  })
  const instructionsId = useContext(SortableA11yContext)
  const manager = useDragDropManager()
  return {
    /**
     * Abandons a drag in progress (the row goes back, nothing is saved). A touch hold starts the drag
     * at 250 ms, so a long press (500 ms, no movement) calls this before it opens the row's menu.
     */
    cancelDrag: () => {
      if (manager?.dragOperation.status.dragging) manager.actions.stop({ canceled: true })
    },
    ref: (element: Element | null) => {
      ref(element)
      into.ref(element)
    },
    isDragging,
    /** True only while a row that this one accepts is hovering its middle. */
    isDropTarget: !!dropInto && into.isDropTarget,
    /** Props for the row element: the keyboard instructions, read as its description. */
    a11y: slot ? { 'aria-describedby': instructionsId } : {},
  }
}

/**
 * A drop zone that moves the dragged row to the top level (`into: null`). It exists only while a
 * pointer drag of a row it `accepts` runs, so `visible` tells the caller when to draw it.
 */
export function useTopLevelDropZone(
  id: string,
  accepts: (sourceId: string) => boolean,
  label: string,
) {
  const sourceId = useContext(PointerDragContext)
  const visible = sourceId !== null && accepts(sourceId)
  const zone = useDroppable({
    id,
    disabled: !visible,
    accept: (source) => accepts(String(source.id)),
    collisionDetector: insideZone,
    collisionPriority: INTO_PRIORITY,
    data: { dropInto: null, label },
  })
  return { ref: zone.ref, visible, isDropTarget: visible && zone.isDropTarget }
}
