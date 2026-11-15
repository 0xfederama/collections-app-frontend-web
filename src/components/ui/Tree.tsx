import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { TreeDragProvider } from './sortable'
import { TreeDragChip } from './TreeDragChip'
import { TreeRow, type TreeRowDrop } from './TreeRow'
import type { TreeDrop } from './treeDrag'
import { useTreeDrag, type TreeDragRules } from './useTreeDrag'

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

/** Opt-in drag and drop of rows (web 3.3.0, D-158): the rules come from the feature that owns the tree. */
interface TreeDragConfig<
  T extends TreeNodeBase,
  D extends TreeDrop = TreeDrop,
> extends TreeDragRules<D> {
  /** Name read out in announcements. */
  label: (node: T) => string
  /** Whether the row can be picked up. */
  canDrag: (node: T) => boolean
}

export interface TreeProps<T extends TreeNodeBase, D extends TreeDrop = TreeDrop> {
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
   * Opt-in drag and drop. A pointer drag projects a target from the row under the pointer, a
   * keyboard drag (Space, arrows, Space) walks `steps`; both draw the drop's indicator.
   */
  drag?: TreeDragConfig<T, D>
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
 * Presentational: no data fetching. Drag and drop is opt-in through `drag`: each draggable row is its
 * own handle (press and drag; Space then arrows on the keyboard) and the library itself stays behind
 * `./sortable`.
 */
export function Tree<T extends TreeNodeBase, D extends TreeDrop = TreeDrop>({
  nodes,
  expanded,
  onExpandedChange,
  selected,
  onSelectedChange,
  renderRow,
  drag,
  className,
  ...rest
}: TreeProps<T, D>) {
  const rows: FlatRow<T>[] = []
  const walk = (list: T[], level: number, parentId: string | null) => {
    list.forEach((node, index) => {
      rows.push({ node, level, parentId, setSize: list.length, posInSet: index + 1 })
      if (node.children?.length && expanded.has(node.id))
        walk(node.children as T[], level + 1, node.id)
    })
  }
  walk(nodes, 1, null)

  const listRef = useRef<HTMLUListElement | null>(null)
  const dragState = useTreeDrag<D>({
    listRef,
    rules: drag,
    rows: rows.map(({ node }) => ({
      id: node.id,
      container: !!node.children,
      label: drag?.label(node) ?? '',
      draggable: drag?.canDrag(node) ?? false,
    })),
  })
  const drop = dragState.active?.drop?.indicator ?? null
  const dropOn = (id: string): TreeRowDrop | undefined => {
    if (!drop || drop.rowId !== id) return undefined
    return drop.kind === 'into'
      ? { kind: 'into' }
      : { kind: 'line', edge: drop.edge, level: drop.level }
  }

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
    // A keyboard drag in progress owns Space, Enter and the arrows; Space on a draggable row starts one.
    if (dragState.onKeyDown(event)) return
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
    <TreeDragProvider handlers={dragState.handlers}>
      <ul
        ref={listRef}
        role="tree"
        aria-label={rest['aria-label']}
        onKeyDown={onKeyDown}
        onBlur={dragState.onBlur}
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
            draggable={drag?.canDrag(node) ?? false}
            lifted={dragState.active?.kind === 'keyboard' && dragState.active.sourceId === node.id}
            describedBy={dragState.instructionsId}
            drop={dropOn(node.id)}
            onFocusRow={setFocusedId}
            onSelect={onSelectedChange}
            renderRow={renderRow}
          />
        ))}
      </ul>
      {drag && dragState.active?.kind === 'pointer' && dragState.pointerAt && (
        <TreeDragChip point={dragState.pointerAt} label={dragState.active.label} />
      )}
      {drag && (
        <>
          <span id={dragState.instructionsId} hidden>
            {dragState.instructions}
          </span>
          <div role="status" aria-live="assertive" className="sr-only">
            {dragState.announcement}
          </div>
        </>
      )}
    </TreeDragProvider>
  )
}
