import { useLayoutEffect, useRef } from 'react'
import { cx } from '../../lib/cx'
import type { TreeNodeBase, TreeProps } from './Tree'
import { useTreeDragRow } from './sortable'

/** What the tree draws on a row while a drag is aimed at it. */
export type TreeRowDrop =
  { kind: 'into' } | { kind: 'line'; edge: 'before' | 'after'; level: number }

interface TreeRowProps<T extends TreeNodeBase> {
  node: T
  level: number
  setSize: number
  posInSet: number
  tabbable: boolean
  expanded: ReadonlySet<string>
  selected: boolean
  /** Whether the pointer can lift this row (a keyboard drag starts from the tree's own key handler). */
  draggable: boolean
  /** The row being moved by the keyboard. */
  lifted: boolean
  /** Id of the keyboard instructions, read as the row's description. */
  describedBy: string | undefined
  drop: TreeRowDrop | undefined
  onFocusRow: (id: string) => void
  onSelect: (id: string) => void
  renderRow: TreeProps<T>['renderRow']
}

/** Indent per nesting level, px (web 3.1.0: 16 read as too shallow; D-entry in DECISIONS.md). */
const INDENT = 24
const BASE_INDENT = 8

const INNER_CONTROLS = 'button, a[href], input, select, textarea, [tabindex]'

export function TreeRow<T extends TreeNodeBase>({
  node,
  level,
  setSize,
  posInSet,
  tabbable,
  expanded,
  selected,
  draggable,
  lifted,
  describedBy,
  drop,
  onFocusRow,
  onSelect,
  renderRow,
}: TreeRowProps<T>) {
  const { ref, isDragging } = useTreeDragRow(node.id, !draggable)
  const liRef = useRef<HTMLLIElement | null>(null)
  // The whole tree is one Tab stop: only the roving row's inner controls (menu button,
  // anything the consumer renders) stay in the Tab order. Others are set to -1 and restored later.
  useLayoutEffect(() => {
    liRef.current?.querySelectorAll<HTMLElement>(INNER_CONTROLS).forEach((el) => {
      if (tabbable) {
        const original = el.dataset.treeTab
        if (original === undefined) return
        if (original === '') el.removeAttribute('tabindex')
        else el.setAttribute('tabindex', original)
        delete el.dataset.treeTab
      } else if (el.dataset.treeTab === undefined) {
        el.dataset.treeTab = el.getAttribute('tabindex') ?? ''
        el.setAttribute('tabindex', '-1')
      }
    })
  })
  const hasChildren = !!node.children?.length
  const isExpanded = expanded.has(node.id)
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keys are handled on the parent tree list (onKeyDown, roving tabindex); a click only selects the row
    <li
      ref={(el) => {
        liRef.current = el
        return ref(el)
      }}
      role="treeitem"
      aria-describedby={draggable ? describedBy : undefined}
      data-tree-id={node.id}
      aria-level={level}
      aria-setsize={setSize}
      aria-posinset={posInSet}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={selected}
      tabIndex={tabbable ? 0 : -1}
      // Focus anywhere inside the row (its link or menu button) makes it the roving stop.
      onFocus={() => onFocusRow(node.id)}
      onClick={(event) => {
        // A drag that ended on this row is not a click (dnd-kit cancels it).
        if (event.defaultPrevented) return
        onFocusRow(node.id)
        onSelect(node.id)
      }}
      style={{ paddingInlineStart: `${(level - 1) * INDENT + BASE_INDENT}px` }}
      className={cx(
        'group/row relative flex min-h-9 cursor-pointer select-none items-center [-webkit-touch-callout:none] gap-1 rounded-md pr-2 text-ui text-text hover:bg-fill-hover focus-visible:bg-fill-hover focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus-ring aria-selected:bg-accent-tint aria-selected:focus-visible:bg-accent-tint aria-selected:font-medium aria-selected:text-accent-text pointer-coarse:min-h-11',
        (isDragging || lifted) && 'bg-surface-raised opacity-80 shadow-md',
        drop?.kind === 'into' && 'bg-accent-tint text-accent-text',
      )}
    >
      {renderRow(node, { level, expanded: isExpanded, selected, hasChildren })}
      {drop?.kind === 'line' && (
        <span
          aria-hidden
          data-tree-drop-line={drop.edge}
          data-tree-drop-level={drop.level}
          style={{ left: `${(drop.level - 1) * INDENT + BASE_INDENT}px` }}
          className={cx(
            'pointer-events-none absolute right-2 h-0.5 rounded-full bg-accent',
            drop.edge === 'before' ? 'top-0' : 'bottom-0',
          )}
        />
      )}
    </li>
  )
}
