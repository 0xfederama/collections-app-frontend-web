import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Tree, type TreeNodeBase } from './Tree'

interface N extends TreeNodeBase {
  name: string
  children?: N[]
}

const nodes: N[] = [
  {
    id: 'a',
    name: 'Alpha',
    children: [
      { id: 'a1', name: 'Alpha one' },
      { id: 'a2', name: 'Alpha two' },
    ],
  },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma', children: [{ id: 'c1', name: 'Gamma one' }] },
]

function Harness({
  initialExpanded = [],
  initialSelected = null,
}: {
  initialExpanded?: string[]
  initialSelected?: string | null
}) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(initialExpanded))
  const [selected, setSelected] = useState<string | null>(initialSelected)
  return (
    <Tree
      aria-label="Collections"
      nodes={nodes}
      expanded={expanded}
      onExpandedChange={setExpanded}
      selected={selected}
      onSelectedChange={setSelected}
      renderRow={(n) => <span>{n.name}</span>}
    />
  )
}

const item = (name: string) => screen.getByRole('treeitem', { name })

describe('Tree', () => {
  it('has tree and treeitem roles with level, expanded and selected attributes', () => {
    render(<Harness initialExpanded={['a']} initialSelected="b" />)
    expect(screen.getByRole('tree', { name: 'Collections' })).toBeInTheDocument()
    expect(screen.getAllByRole('treeitem')).toHaveLength(5)
    expect(item('Alpha')).toHaveAttribute('aria-level', '1')
    expect(item('Alpha')).toHaveAttribute('aria-expanded', 'true')
    expect(item('Alpha one')).toHaveAttribute('aria-level', '2')
    expect(item('Gamma')).toHaveAttribute('aria-expanded', 'false')
    expect(item('Beta')).not.toHaveAttribute('aria-expanded')
    expect(item('Beta')).toHaveAttribute('aria-selected', 'true')
    expect(item('Alpha')).toHaveAttribute('aria-selected', 'false')
  })

  it('hides children of collapsed nodes', () => {
    render(<Harness />)
    expect(screen.queryByRole('treeitem', { name: 'Alpha one' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('treeitem')).toHaveLength(3)
  })

  it('uses a roving tabindex (one tab stop)', () => {
    render(<Harness initialExpanded={['a']} />)
    const items = screen.getAllByRole('treeitem')
    expect(items.filter((i) => i.getAttribute('tabindex') === '0')).toHaveLength(1)
    expect(items[0]).toHaveAttribute('tabindex', '0')
  })

  it('the selected item is the tab stop', () => {
    render(<Harness initialSelected="b" />)
    expect(item('Beta')).toHaveAttribute('tabindex', '0')
    expect(item('Alpha')).toHaveAttribute('tabindex', '-1')
  })

  it('ArrowDown/ArrowUp/Home/End move focus and the tab stop', async () => {
    const user = userEvent.setup()
    render(<Harness initialExpanded={['a']} />)
    await user.tab()
    expect(item('Alpha')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(item('Alpha one')).toHaveFocus()
    expect(item('Alpha one')).toHaveAttribute('tabindex', '0')
    expect(item('Alpha')).toHaveAttribute('tabindex', '-1')
    await user.keyboard('{ArrowUp}')
    expect(item('Alpha')).toHaveFocus()
    await user.keyboard('{End}')
    expect(item('Gamma')).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(item('Gamma')).toHaveFocus()
    await user.keyboard('{Home}')
    expect(item('Alpha')).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(item('Alpha')).toHaveFocus()
  })

  it('ArrowRight expands a collapsed node, then moves to its first child', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('{ArrowRight}')
    expect(item('Alpha')).toHaveAttribute('aria-expanded', 'true')
    expect(item('Alpha')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(item('Alpha one')).toHaveFocus()
  })

  it('ArrowRight on a leaf does nothing', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(item('Beta')).toHaveFocus()
    await user.keyboard('{ArrowRight}')
    expect(item('Beta')).toHaveFocus()
  })

  it('ArrowLeft collapses an expanded node, then moves to the parent', async () => {
    const user = userEvent.setup()
    render(<Harness initialExpanded={['a']} />)
    await user.tab()
    await user.keyboard('{ArrowDown}')
    expect(item('Alpha one')).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(item('Alpha')).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(item('Alpha')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('treeitem', { name: 'Alpha one' })).not.toBeInTheDocument()
  })

  it('Enter selects the focused item; Space too', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    await user.keyboard('{ArrowDown}{Enter}')
    expect(item('Beta')).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowUp} ')
    expect(item('Alpha')).toHaveAttribute('aria-selected', 'true')
    expect(item('Beta')).toHaveAttribute('aria-selected', 'false')
  })

  it('clicking a row selects it', async () => {
    render(<Harness />)
    await userEvent.click(item('Beta'))
    expect(item('Beta')).toHaveAttribute('aria-selected', 'true')
  })

  it('passes row state to renderRow', () => {
    render(
      <Tree
        aria-label="T"
        nodes={nodes}
        expanded={new Set(['a'])}
        onExpandedChange={() => {}}
        selected="a"
        onSelectedChange={() => {}}
        renderRow={(n, s) => (
          <span>
            {n.name}:{s.level}:{String(s.expanded)}:{String(s.selected)}:{String(s.hasChildren)}
          </span>
        )}
      />,
    )
    expect(screen.getByText('Alpha:1:true:true:true')).toBeInTheDocument()
    expect(screen.getByText('Beta:1:false:false:false')).toBeInTheDocument()
    expect(screen.getByText('Alpha one:2:false:false:false')).toBeInTheDocument()
  })
})
