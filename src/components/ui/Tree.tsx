import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { cx } from '../../lib/cx'
import { ChevronRight } from './icons'

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
 * Presentational: no data fetching and no drag and drop.
 */
export function Tree<T extends TreeNodeBase>({
  nodes,
  expanded,
  onExpandedChange,
  selected,
  onSelectedChange,
  renderRow,
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
    if (!row || event.target !== document.activeElement) return
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
    <ul
      role="tree"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
      className={cx('flex flex-col gap-0.5', className)}
    >
      {rows.map(({ node, level, setSize, posInSet }, index) => {
        const hasChildren = !!node.children?.length
        const isExpanded = expanded.has(node.id)
        const isSelected = node.id === selected
        return (
          <li
            key={node.id}
            role="treeitem"
            data-tree-id={node.id}
            aria-level={level}
            aria-setsize={setSize}
            aria-posinset={posInSet}
            aria-expanded={hasChildren ? isExpanded : undefined}
            aria-selected={isSelected}
            tabIndex={index === focusIndex ? 0 : -1}
            onFocus={(e) => e.target === e.currentTarget && setFocusedId(node.id)}
            onClick={() => {
              setFocusedId(node.id)
              onSelectedChange(node.id)
            }}
            style={{ paddingInlineStart: `${(level - 1) * 16 + 4}px` }}
            className="flex min-h-9 cursor-pointer items-center gap-1 rounded-sm pr-2 text-sm text-text hover:bg-border aria-selected:bg-border aria-selected:font-medium aria-selected:shadow-[inset_3px_0_0_var(--accent)] pointer-coarse:min-h-11"
          >
            <span
              aria-hidden
              onClick={(e) => {
                if (!hasChildren) return
                e.stopPropagation()
                toggle(node.id)
              }}
              className="flex size-6 shrink-0 items-center justify-center text-text-muted"
            >
              {hasChildren && (
                <ChevronRight
                  className={cx('size-4 transition-transform', isExpanded && 'rotate-90')}
                />
              )}
            </span>
            {renderRow(node as T, {
              level,
              expanded: isExpanded,
              selected: isSelected,
              hasChildren,
            })}
          </li>
        )
      })}
    </ul>
  )
}
