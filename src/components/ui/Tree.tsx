import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { SortableProvider, useSortableRow, type SortableMove, type SortableSlot } from './sortable'

export interface TreeNodeBase {
  id: string
  children?: TreeNodeBase[]
}

export interface TreeRowState {
  level: number
  expanded: boolean
  selected: boolean
  hasChildren: boolean
}

export interface TreeProps<T extends TreeNodeBase> {
  'aria-label': string
  nodes: T[]
  /** Controlled: ids of expanded nodes. */
  expanded: ReadonlySet<string>
  onExpandedChange: (expanded: Set<string>) => void
  /** Controlled: id of the selected node, or null. */
  selected: string | null
  onSelectedChange: (id: string) => void
  /** Row content (icon, name, count). Indentation is drawn by the Tree; a folder's own icon shows and toggles its state. */
  renderRow: (node: T, state: TreeRowState) => ReactNode
  /**
   * Opt-in drag reorder: which sortable group and position a node has (`undefined` = not
   * sortable). Dragging only reorders inside a group, never across groups or parents.
   */
  sortable?: (node: T) => SortableSlot | undefined
  /** Called once when a drag ends with a changed position. Not called on cancel. */
  onReorder?: (move: SortableMove) => void
  className?: string
}

interface FlatRow<T> {
  node: T
  level: number
  parentId: string | null
  setSize: number
  posInSet: number
}

/**
 * ARIA tree (flat treeitems with aria-level): roving tabindex, arrows, Home/End, Enter/Space.
 * Presentational: no data fetching. Drag reorder is opt-in through `sortable` + `onReorder`: each
 * sortable row is its own drag handle (press and drag; Space then arrows on the keyboard) and the
 * library itself stays behind `./sortable`.
 */
export function Tree<T extends TreeNodeBase>({
  nodes,
  expanded,
  onExpandedChange,
  selected,
  onSelectedChange,
  renderRow,
  sortable,
  onReorder,
  className,
  ...rest
}: TreeProps<T>) {
  const rows: FlatRow<T>[] = []
  const walk = (list: T[], level: number, parentId: string | null) => {
    list.forEach((node, index) => {
      rows.push({ node, level, parentId, setSize: list.length, posInSet: index + 1 })
      if (node.children?.length && expanded.has(node.id))
        walk(node.children as T[], level + 1, node.id)
    })
  }
  walk(nodes, 1, null)

  const [focusedId, setFocusedId] = useState<string | null>(null)
  const focusIndexRaw = rows.findIndex((r) => r.node.id === (focusedId ?? selected))
  const focusIndex = focusIndexRaw >= 0 ? focusIndexRaw : 0

  const toggle = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onExpandedChange(next)
  }

  const moveTo = (index: number, container: HTMLElement) => {
    const row = rows[Math.max(0, Math.min(index, rows.length - 1))]
    if (!row) return
    setFocusedId(row.node.id)
    container.querySelector<HTMLElement>(`[data-tree-id="${CSS.escape(row.node.id)}"]`)?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const row = rows[focusIndex]
    // A keyboard drag in progress owns Space and the arrows (the sortable layer already handled them).
    if (event.defaultPrevented) return
    // Keys pressed inside a row's own buttons or links (the menu) are theirs, not the tree's.
    if (!row || (event.target as HTMLElement).getAttribute('role') !== 'treeitem') return
    const container = event.currentTarget
    const hasChildren = !!row.node.children?.length
    const isExpanded = expanded.has(row.node.id)
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        moveTo(focusIndex + 1, container)
        break
      case 'ArrowUp':
        event.preventDefault()
        moveTo(focusIndex - 1, container)
        break
      case 'Home':
        event.preventDefault()
        moveTo(0, container)
        break
      case 'End':
        event.preventDefault()
        moveTo(rows.length - 1, container)
        break
      case 'ArrowRight':
        event.preventDefault()
        if (hasChildren && !isExpanded) toggle(row.node.id)
        else if (hasChildren) moveTo(focusIndex + 1, container)
        break
      case 'ArrowLeft':
        event.preventDefault()
        if (hasChildren && isExpanded) toggle(row.node.id)
        else if (row.parentId)
          moveTo(
            rows.findIndex((r) => r.node.id === row.parentId),
            container,
          )
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        onSelectedChange(row.node.id)
        break
    }
  }

  return (
    <SortableProvider onMove={(move) => onReorder?.(move)}>
      <ul
        role="tree"
        aria-label={rest['aria-label']}
        onKeyDown={onKeyDown}
        className={cx('flex flex-col gap-0.5', className)}
      >
        {rows.map(({ node, level, setSize, posInSet }, index) => (
          <TreeRow
            key={node.id}
            node={node}
            level={level}
            setSize={setSize}
            posInSet={posInSet}
            tabbable={index === focusIndex}
            expanded={expanded}
            selected={node.id === selected}
            slot={sortable?.(node)}
            onFocusRow={setFocusedId}
            onSelect={onSelectedChange}
            renderRow={renderRow}
          />
        ))}
      </ul>
    </SortableProvider>
  )
}

interface TreeRowProps<T extends TreeNodeBase> {
  node: T
  level: number
  setSize: number
  posInSet: number
  tabbable: boolean
  expanded: ReadonlySet<string>
  selected: boolean
  slot: SortableSlot | undefined
  onFocusRow: (id: string) => void
  onSelect: (id: string) => void
  renderRow: TreeProps<T>['renderRow']
}

const INNER_CONTROLS = 'button, a[href], input, select, textarea, [tabindex]'

function TreeRow<T extends TreeNodeBase>({
  node,
  level,
  setSize,
  posInSet,
  tabbable,
  expanded,
  selected,
  slot,
  onFocusRow,
  onSelect,
  renderRow,
}: TreeRowProps<T>) {
  const { ref, isDragging, a11y } = useSortableRow(node.id, slot)
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
    <li
      ref={(el) => {
        liRef.current = el
        return ref(el)
      }}
      role="treeitem"
      {...a11y}
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
      style={{ paddingInlineStart: `${(level - 1) * 16 + 8}px` }}
      className={cx(
        'group/row flex min-h-9 cursor-pointer select-none items-center [-webkit-touch-callout:none] gap-1 rounded-md pr-2 text-sm text-text hover:bg-fill-hover aria-selected:bg-accent/10 aria-selected:font-medium aria-selected:text-accent-text pointer-coarse:min-h-11',
        isDragging && 'bg-surface-raised opacity-80 shadow-md',
      )}
    >
      {renderRow(node, { level, expanded: isExpanded, selected, hasChildren })}
    </li>
  )
}
