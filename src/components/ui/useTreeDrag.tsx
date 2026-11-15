import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from 'react'
import { DRAG_PLACEHOLDER, type TreeDragHandlers } from './sortable'
import { hitTest, type TreeDrop, type TreeHit, type TreeHitRow } from './treeDrag'

/** What `Tree` needs to know about the feature's drag rules (web 3.3.0, D-158). */
export interface TreeDragRules<D extends TreeDrop> {
  /** The drop a pointer over this part of a row (or below the last row) means, or `null` when forbidden. */
  project: (sourceId: string, hit: TreeHit) => D | null
  /** Every drop the arrow keys walk through for a picked-up row, top to bottom, its own place included. */
  steps: (sourceId: string) => D[]
  /** Called once with a drop that changes something. */
  onDrop: (drop: D) => void
}

export interface TreeDragRow {
  id: string
  container: boolean
  /** Name read out in announcements. */
  label: string
  draggable: boolean
}

const INSTRUCTIONS =
  'Press Space to pick the row up. Use the up and down arrow keys to choose where it goes, Space or Enter to drop it, Escape to cancel.'

interface KeyboardDrag<D> {
  sourceId: string
  steps: D[]
  at: number
}

/**
 * The state of a tree drag, from the pointer (`handlers` go to `TreeDragProvider`) or the keyboard
 * (`onKeyDown` / `onBlur` go on the list). Both end in the same projected `drop`; nothing here knows
 * what a folder or a kind is.
 */
export function useTreeDrag<D extends TreeDrop>({
  rows,
  listRef,
  rules,
}: {
  rows: readonly TreeDragRow[]
  listRef: RefObject<HTMLUListElement | null>
  rules: TreeDragRules<D> | undefined
}) {
  const instructionsId = useId()
  const [announcement, setAnnouncement] = useState('')
  const [pointer, setPointer] = useState<{ sourceId: string; drop: D | null } | null>(null)
  const [keyboard, setKeyboard] = useState<KeyboardDrag<D> | null>(null)
  const sourceRef = useRef<string | null>(null)
  const pointRef = useRef<{ x: number; y: number } | null>(null)
  // The latest props, read by dnd-kit's event callbacks (which outlive a render).
  const rowsRef = useRef(rows)
  const rulesRef = useRef(rules)
  useLayoutEffect(() => {
    rowsRef.current = rows
    rulesRef.current = rules
  })

  const labelOf = (id: string) => rowsRef.current.find((row) => row.id === id)?.label ?? ''
  // dnd-kit fires its events while React may be committing, where a state update is not allowed.
  const later = (fn: () => void) => queueMicrotask(fn)
  const announce = (text: string) => later(() => setAnnouncement(text))

  const measure = () => {
    const list = listRef.current
    if (!list) return null
    // While a row is lifted dnd-kit leaves a placeholder in its place and moves the real element
    // with the pointer: the placeholder is where the row's slot is.
    const found = new Map<string, Element>()
    for (const element of list.querySelectorAll('[data-tree-id]')) {
      const id = element.getAttribute('data-tree-id')
      if (id && (!found.has(id) || element.matches(DRAG_PLACEHOLDER))) found.set(id, element)
    }
    const measured: TreeHitRow[] = []
    for (const row of rowsRef.current) {
      const element = found.get(row.id)
      if (!element) continue
      const { top, bottom } = element.getBoundingClientRect()
      measured.push({ id: row.id, top, bottom, container: row.container })
    }
    // The tree's own box is the space below the last row too (the sidebar's scroll area).
    const area = (list.parentElement ?? list).getBoundingClientRect()
    return { rows: measured, area }
  }

  const resolve = (point: { x: number; y: number }): D | null => {
    const sourceId = sourceRef.current
    const measured = measure()
    if (!sourceId || !measured || !rulesRef.current) return null
    const hit = hitTest(measured.rows, measured.area, point)
    return hit ? rulesRef.current.project(sourceId, hit) : null
  }

  const handlers: TreeDragHandlers = {
    onStart: (id) => {
      sourceRef.current = id
      pointRef.current = null
      later(() => setPointer({ sourceId: id, drop: null }))
      announce(`Picked up ${labelOf(id)}.`)
    },
    onMove: (point) => {
      pointRef.current = point
      const drop = resolve(point)
      later(() =>
        setPointer((current) =>
          current && current.drop?.key !== drop?.key ? { ...current, drop } : current,
        ),
      )
    },
    onEnd: (canceled) => {
      const sourceId = sourceRef.current
      const point = pointRef.current
      const drop = canceled || !point ? null : resolve(point)
      sourceRef.current = null
      later(() => setPointer(null))
      if (!sourceId) return
      const name = labelOf(sourceId)
      if (drop?.indicator) {
        rulesRef.current?.onDrop(drop)
        announce(`Dropped ${name}. ${drop.description}`)
      } else {
        announce(
          canceled
            ? `Move cancelled. ${name} is back in its place.`
            : `Dropped ${name}. Back in its place.`,
        )
      }
    },
  }

  const stopKeyboard = () => setKeyboard(null)

  /** Returns true when the key was a drag key (the tree must not treat it as navigation). */
  const onKeyDown = (event: KeyboardEvent<HTMLElement>): boolean => {
    if (!rules || event.defaultPrevented) return false
    if (keyboard) {
      const key = event.key
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault()
        const at = Math.max(
          0,
          Math.min(keyboard.steps.length - 1, keyboard.at + (key === 'ArrowDown' ? 1 : -1)),
        )
        setKeyboard({ ...keyboard, at })
        announce(keyboard.steps[at]?.description ?? '')
      } else if (key === ' ' || key === 'Enter' || key === 'Tab') {
        if (key !== 'Tab') event.preventDefault()
        const drop = keyboard.steps[keyboard.at]
        const name = labelOf(keyboard.sourceId)
        stopKeyboard()
        if (drop?.indicator) {
          rules.onDrop(drop)
          announce(`Dropped ${name}. ${drop.description}`)
        } else {
          announce(`Dropped ${name}. Back in its place.`)
        }
      } else if (key === 'Escape') {
        event.preventDefault()
        stopKeyboard()
        announce(`Move cancelled. ${labelOf(keyboard.sourceId)} is back in its place.`)
      } else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
        event.preventDefault()
      }
      return true
    }
    if (event.key !== ' ' || pointer) return false
    // Space picks up from the row itself or the link inside it; the row's buttons keep their own Space.
    const target = event.target as HTMLElement
    const row = target.closest<HTMLElement>('[role="treeitem"]')
    const id = row?.dataset.treeId
    if (!row || !id || !rowsRef.current.some((r) => r.id === id && r.draggable)) return false
    if (target !== row && !(target instanceof HTMLAnchorElement)) return false
    event.preventDefault()
    sourceRef.current = id
    const steps = rules.steps(id)
    setKeyboard({
      sourceId: id,
      steps,
      at: Math.max(
        0,
        steps.findIndex((s) => !s.indicator),
      ),
    })
    announce(`Picked up ${labelOf(id)}.`)
    return true
  }

  /** Focus leaving the tree abandons a keyboard drag. */
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (keyboard && !event.currentTarget.contains(event.relatedTarget as Node | null))
      stopKeyboard()
  }

  const active = pointer
    ? { sourceId: pointer.sourceId, drop: pointer.drop }
    : keyboard
      ? { sourceId: keyboard.sourceId, drop: keyboard.steps[keyboard.at] ?? null }
      : null

  return {
    handlers,
    onKeyDown,
    onBlur,
    active,
    announcement,
    instructionsId,
    instructions: INSTRUCTIONS,
  }
}
