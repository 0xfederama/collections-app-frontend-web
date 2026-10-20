import { useState } from 'react'
import { Tree } from '../../components/ui'
import { Folder } from '../../components/ui/icons'
import { arrayMove } from '../../components/ui/sortable'
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

/** Tree with drag reorder: grab the handle (hover or focus a row) or use Space, arrows, Space on it. */
function SortableTreeDemo() {
  const [names, setNames] = useState(['Alpha', 'Beta', 'Gamma', 'Delta'])
  return (
    <div className="max-w-xs rounded-lg bg-surface p-2 shadow-sm">
      <p className="px-2 pb-1 text-xs text-text-muted">Reorderable (drag handle, keyboard)</p>
      <Tree
        aria-label="Reorderable lists"
        nodes={names.map((name) => ({ id: name, name }))}
        expanded={new Set()}
        onExpandedChange={() => {}}
        selected={null}
        onSelectedChange={() => {}}
        sortable={(node) => ({
          group: 'demo',
          index: names.indexOf(node.id),
          size: names.length,
          label: node.id,
        })}
        onReorder={({ from, to }) => setNames((current) => arrayMove(current, from, to))}
        renderRow={(node) => <span className="min-w-0 flex-1 truncate">{node.name}</span>}
      />
    </div>
  )
}
