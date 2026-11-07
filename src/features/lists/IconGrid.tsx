import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { cx } from '../../lib/cx'

export interface IconGridCell {
  key: string
  label: string
  pressed: boolean
  content: ReactNode
  /** Cells that follow each other with the same group share a small heading. */
  group?: string
  /** Emoji render as text, built-in icons as a muted glyph. */
  text?: boolean
}

/** Columns are fixed so the arrow keys can move by a row (7 x 40 px fits a 20 rem popover). */
const GRID_COLUMNS = 7

/** Groups painted at once; the rest follow one per tick so a large grid never blocks a frame. */
const FIRST_GROUPS = 2

interface Section {
  label: string | undefined
  start: number
  cells: IconGridCell[]
}

function sectionsOf(cells: IconGridCell[]): Section[] {
  const sections: Section[] = []
  cells.forEach((cell, index) => {
    const last = sections[sections.length - 1]
    if (last && last.label === cell.group) last.cells.push(cell)
    else sections.push({ label: cell.group, start: index, cells: [cell] })
  })
  return sections
}

/** Row moves stay in a group's own grid and continue into the neighbouring group at the same column. */
function verticalTarget(sections: Section[], index: number, direction: 1 | -1): number {
  const at = sections.findIndex((s) => index >= s.start && index < s.start + s.cells.length)
  const section = sections[at]
  if (!section) return index
  const offset = index - section.start
  const column = offset % GRID_COLUMNS
  const length = section.cells.length
  if (direction === 1) {
    if (offset < Math.floor((length - 1) / GRID_COLUMNS) * GRID_COLUMNS) {
      return section.start + Math.min(offset + GRID_COLUMNS, length - 1)
    }
    const next = sections[at + 1]
    return next ? next.start + Math.min(column, next.cells.length - 1) : index
  }
  if (offset >= GRID_COLUMNS) return index - GRID_COLUMNS
  const previous = sections[at - 1]
  if (!previous) return index
  const lastRow = Math.floor((previous.cells.length - 1) / GRID_COLUMNS) * GRID_COLUMNS
  return previous.start + Math.min(lastRow + column, previous.cells.length - 1)
}

export interface IconGridHandle {
  focusFirst: () => void
}

/**
 * A roving-tabindex grid of buttons: one tab stop, arrows move by cell or row, Home / End jump.
 * The selected cell is the tab stop until focus moves. Remount it (`key`) when the cells change.
 */
export const IconGrid = forwardRef<
  IconGridHandle,
  { label: string; cells: IconGridCell[]; onPick: (key: string) => void; disabled?: boolean }
>(function IconGrid({ label, cells, onPick, disabled }, ref) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const sections = sectionsOf(cells)
  const [shown, setShown] = useState(FIRST_GROUPS)
  useEffect(() => {
    if (shown >= sections.length) return
    const timer = setTimeout(() => setShown((count) => count + 1), 0)
    return () => clearTimeout(timer)
  }, [shown, sections.length])
  const [active, setActive] = useState<number | null>(null)
  const stop =
    active !== null && active < cells.length
      ? active
      : Math.max(
          0,
          cells.findIndex((cell) => cell.pressed),
        )

  const focusAt = (index: number) => {
    const next = Math.max(0, Math.min(cells.length - 1, index))
    setActive(next)
    buttons.current[next]?.focus()
  }
  useImperativeHandle(ref, () => ({ focusFirst: () => focusAt(stop) }))

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      ArrowDown: sections.length > 1 ? verticalTarget(sections, index, 1) : index + GRID_COLUMNS,
      ArrowUp: sections.length > 1 ? verticalTarget(sections, index, -1) : index - GRID_COLUMNS,
      Home: 0,
      End: cells.length - 1,
    }
    const target = moves[event.key]
    if (target === undefined) return
    event.preventDefault()
    focusAt(target)
  }

  const grid = (section: Section) => (
    <div
      role="group"
      aria-label={section.label ?? label}
      className="grid grid-cols-7 content-start gap-0.5"
    >
      {section.cells.map((cell, offset) => {
        const index = section.start + offset
        return (
          <button
            key={cell.key}
            ref={(element) => {
              buttons.current[index] = element
            }}
            type="button"
            aria-label={cell.label}
            aria-pressed={cell.pressed}
            disabled={disabled}
            tabIndex={index === stop ? 0 : -1}
            onFocus={() => setActive(index)}
            onClick={() => onPick(cell.key)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cx(
              'grid size-10 place-items-center rounded-md hover:bg-fill-hover aria-pressed:bg-accent-tint aria-pressed:text-accent-text disabled:opacity-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-ring',
              cell.text ? 'text-section' : 'text-text-muted',
            )}
          >
            {cell.content}
          </button>
        )
      })}
    </div>
  )

  if (sections.length === 1 && sections[0]?.label === undefined) {
    return sections[0] ? grid(sections[0]) : null
  }
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      {sections.slice(0, shown).map((section) => (
        <section key={section.label}>
          <h4 aria-hidden className="px-1 pb-1 text-label text-text-muted">
            {section.label}
          </h4>
          {grid(section)}
        </section>
      ))}
    </div>
  )
})
