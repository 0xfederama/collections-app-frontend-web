import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { ChevronRight, GripVertical } from './icons'
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
  /** Row content (icon, name, count). The chevron and indentation are drawn by the Tree. */
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
 * sortable row gets a drag handle (a real button, so the keyboard sensor works) and the library
 * itself stays behind `./sortable`.
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
    // Keys pressed inside a row's own buttons or links (menu, drag handle) are theirs, not the tree's.
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
            onToggle={toggle}
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
  onToggle: (id: string) => void
  renderRow: TreeProps<T>['renderRow']
}

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
  onToggle,
  renderRow,
}: TreeRowProps<T>) {
  const { ref, handleRef, isDragging } = useSortableRow(node.id, slot)
  const hasChildren = !!node.children?.length
  const isExpanded = expanded.has(node.id)
  return (
    <li
      ref={ref}
      role="treeitem"
      data-tree-id={node.id}
      aria-level={level}
      aria-setsize={setSize}
      aria-posinset={posInSet}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={selected}
      tabIndex={tabbable ? 0 : -1}
      // Focus anywhere inside the row (its link, menu button or drag handle) makes it the roving stop.
      onFocus={() => onFocusRow(node.id)}
      onClick={() => {
        onFocusRow(node.id)
        onSelect(node.id)
      }}
      style={{ paddingInlineStart: `${(level - 1) * 16 + 4}px` }}
      className={cx(
        'group/row flex min-h-9 cursor-pointer items-center gap-1 rounded-sm pr-2 text-sm text-text hover:bg-border aria-selected:bg-border aria-selected:font-medium aria-selected:shadow-[inset_3px_0_0_var(--accent)] pointer-coarse:min-h-11',
        isDragging && 'bg-surface-raised opacity-80 shadow-md',
      )}
    >
      <span
        aria-hidden
        onClick={(e) => {
          if (!hasChildren) return
          e.stopPropagation()
          onToggle(node.id)
        }}
        className="flex size-6 shrink-0 items-center justify-center text-text-muted"
      >
        {hasChildren && (
          <ChevronRight className={cx('size-4 transition-transform', isExpanded && 'rotate-90')} />
        )}
      </span>
      {renderRow(node, { level, expanded: isExpanded, selected, hasChildren })}
      {slot && (
        <button
          ref={handleRef}
          type="button"
          aria-label={`Reorder ${slot.label}`}
          onClick={(e) => e.stopPropagation()}
          className="flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-text-muted opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 [&_svg]:size-4"
        >
          <GripVertical aria-hidden />
        </button>
      )}
    </li>
  )
}
