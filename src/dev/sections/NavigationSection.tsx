import { useState } from 'react'
import { Tree, type TreeDrop, type TreeHit } from '../../components/ui'
import { Folder } from '../../components/ui/icons'
import { Section } from './shared'

interface DemoNode {
  id: string
  name: string
  children?: DemoNode[]
}
const treeData: DemoNode[] = [
  {
    id: 'bikes',
    name: 'Bikes',
    children: [
      { id: 'adventure', name: 'Adventure' },
      { id: 'naked', name: 'Naked', children: [{ id: 'wishlist', name: 'Wishlist' }] },
    ],
  },
  { id: 'movies', name: 'Movies' },
]

export function NavigationSection() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['bikes']))
  const [selected, setSelected] = useState<string | null>('adventure')
  return (
    <Section id="navigation" title="Tree">
      <div className="max-w-xs rounded-lg bg-surface p-2 shadow-sm">
        <Tree
          aria-label="Collections"
          nodes={treeData}
          expanded={expanded}
          onExpandedChange={setExpanded}
          selected={selected}
          onSelectedChange={setSelected}
          renderRow={(node) => (
            <span className="flex items-center gap-2">
              <Folder aria-hidden className="size-4 text-text-muted" />
              {node.name}
            </span>
          )}
        />
      </div>

      <SortableTreeDemo />
    </Section>
  )
}

interface FlatDrop extends TreeDrop {
  id: string
  /** Index in the list without the dragged row. */
  to: number
}

/** The place a flat list's row would take: before / after the row under the pointer, or last. */
function flatDrop(names: readonly string[], sourceId: string, at: number): FlatDrop {
  const others = names.filter((name) => name !== sourceId)
  const to = Math.max(0, Math.min(at, others.length))
  const unchanged = names.indexOf(sourceId) === to
  const next = others[to]
  const anchor = next
    ? ({ kind: 'line', rowId: next, edge: 'before', level: 1 } as const)
    : ({
        kind: 'line',
        rowId: others[others.length - 1] ?? sourceId,
        edge: 'after',
        level: 1,
      } as const)
  return {
    key: String(to),
    id: sourceId,
    to,
    indicator: unchanged ? null : anchor,
    description: next ? `Before ${next}.` : 'At the end.',
  }
}

/** Tree with drag reorder: press and drag a row, or Space, arrows, Space on it. */
function SortableTreeDemo() {
  const [names, setNames] = useState(['Alpha', 'Beta', 'Gamma', 'Delta'])
  const slot = (sourceId: string, hit: TreeHit) => {
    if ('end' in hit) return names.length
    const at = names.filter((name) => name !== sourceId).indexOf(hit.rowId)
    if (at < 0) return names.indexOf(sourceId)
    return hit.zone === 'before' ? at : at + 1
  }
  return (
    <div className="max-w-xs rounded-lg bg-surface p-2 shadow-sm">
      <p className="px-2 pb-1 text-secondary text-text-muted">Reorderable (drag, keyboard)</p>
      <Tree
        aria-label="Reorderable lists"
        nodes={names.map((name) => ({ id: name, name }))}
        expanded={new Set()}
        onExpandedChange={() => {}}
        selected={null}
        onSelectedChange={() => {}}
        drag={{
          label: (node) => node.name,
          canDrag: () => true,
          project: (sourceId, hit) => flatDrop(names, sourceId, slot(sourceId, hit)),
          steps: (sourceId) => names.map((_, at) => flatDrop(names, sourceId, at)),
          onDrop: ({ id, to }) =>
            setNames((current) => {
              const next = current.filter((name) => name !== id)
              next.splice(to, 0, id)
              return next
            }),
        }}
        renderRow={(node) => <span className="min-w-0 flex-1 truncate">{node.name}</span>}
      />
    </div>
  )
}
