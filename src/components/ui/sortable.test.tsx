import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { drop, handleOf, pickUp, stubLayout } from '../../test-drag'
import { Tree, type TreeNodeBase } from './Tree'
import type { TreeDrop, TreeHit } from './treeDrag'

interface N extends TreeNodeBase {
  name: string
}

const nodes: N[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
]

interface FlatDrop extends TreeDrop {
  id: string
  /** Index among the other rows. */
  to: number
}

/** A flat list's drops: the slot before row `at` of the others (the last one is the end). */
function flat(sourceId: string, at: number): FlatDrop {
  const others = nodes.filter((n) => n.id !== sourceId)
  const to = Math.max(0, Math.min(at, others.length))
  const next = others[to]
  const unchanged = nodes.findIndex((n) => n.id === sourceId) === to
  return {
    id: sourceId,
    to,
    key: String(to),
    indicator: unchanged
      ? null
      : next
        ? { kind: 'line', rowId: next.id, edge: 'before', level: 1 }
        : {
            kind: 'line',
            rowId: others[others.length - 1]?.id ?? sourceId,
            edge: 'after',
            level: 1,
          },
    description: next ? `Before ${next.name}.` : 'At the end.',
  }
}

const project = (sourceId: string, hit: TreeHit) => {
  if ('end' in hit) return flat(sourceId, nodes.length)
  const at = nodes.filter((n) => n.id !== sourceId).findIndex((n) => n.id === hit.rowId)
  if (at < 0)
    return flat(
      sourceId,
      nodes.findIndex((n) => n.id === sourceId),
    )
  return flat(sourceId, hit.zone === 'before' ? at : at + 1)
}

function Harness({
  onDrop,
  onSelect = () => {},
  draggable = true,
}: {
  onDrop: (drop: FlatDrop) => void
  onSelect?: (id: string) => void
  draggable?: boolean
}) {
  return (
    <Tree
      aria-label="Rows"
      nodes={nodes}
      expanded={new Set()}
      onExpandedChange={() => {}}
      selected={null}
      onSelectedChange={onSelect}
      drag={
        draggable
          ? {
              label: (n) => n.name,
              canDrag: () => true,
              project,
              steps: (sourceId) => nodes.map((_, at) => flat(sourceId, at)),
              onDrop,
            }
          : undefined
      }
      renderRow={(n) => <span>{n.name}</span>}
    />
  )
}

const lines = () =>
  [...document.querySelectorAll('[data-tree-drop-line]')].map((el) => [
    el.closest('[role="treeitem"]')?.getAttribute('data-tree-id'),
    el.getAttribute('data-tree-drop-line'),
  ])

describe('AT-21 keyboard drag in the tree (web 3.3.0)', () => {
  beforeEach(stubLayout)

  it('Space, ArrowDown, Space drops the row one slot down', async () => {
    const onDrop = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDrop={onDrop} />)
    const handle = await pickUp(user, 'Alpha')
    await user.keyboard('{ArrowDown}')
    expect(lines()).toEqual([['c', 'before']])
    await drop(user, handle)
    expect(onDrop).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'a', to: 1 }))
    expect(lines()).toEqual([])
  })

  it('two ArrowDown presses reach the end; Enter drops', async () => {
    const onDrop = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDrop={onDrop} />)
    const handle = await pickUp(user, 'Alpha')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(lines()).toEqual([['c', 'after']])
    await drop(user, handle, '{Enter}')
    expect(onDrop).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'a', to: 2 }))
  })

  it('moves up with ArrowUp from the last row', async () => {
    const onDrop = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDrop={onDrop} />)
    const handle = await pickUp(user, 'Gamma')
    await user.keyboard('{ArrowUp}')
    await drop(user, handle)
    expect(onDrop).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'c', to: 1 }))
  })

  it('Escape cancels the drag: nothing is dropped', async () => {
    const onDrop = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDrop={onDrop} />)
    const handle = await pickUp(user, 'Alpha')
    await user.keyboard('{ArrowDown}')
    await drop(user, handle, '{Escape}')
    expect(onDrop).not.toHaveBeenCalled()
    expect(lines()).toEqual([])
  })

  it('dropping without moving drops nothing', async () => {
    const onDrop = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDrop={onDrop} />)
    const handle = await pickUp(user, 'Beta')
    await drop(user, handle)
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('announces the target while moving and on drop', async () => {
    const user = userEvent.setup()
    render(<Harness onDrop={() => {}} />)
    const handle = await pickUp(user, 'Alpha')
    await user.keyboard('{ArrowDown}')
    expect(await screen.findByText('Before Gamma.')).toBeInTheDocument()
    await drop(user, handle)
    expect(await screen.findByText(/^Dropped Alpha\. Before Gamma\./)).toBeInTheDocument()
  })

  it('describes the keyboard instructions for the row', async () => {
    render(<Harness onDrop={() => {}} />)
    await waitFor(() =>
      expect(handleOf('Alpha')).toHaveAccessibleDescription(/Press Space to pick the row up/),
    )
  })

  it('leaving the tree cancels a keyboard drag', async () => {
    const onDrop = vi.fn()
    const user = userEvent.setup()
    render(
      <>
        <Harness onDrop={onDrop} />
        <button type="button">Elsewhere</button>
      </>,
    )
    await pickUp(user, 'Alpha')
    await user.keyboard('{ArrowDown}')
    act(() => screen.getByRole('button', { name: 'Elsewhere' }).focus())
    expect(lines()).toEqual([])
    expect(onDrop).not.toHaveBeenCalled()
  })

  it('Space picks a row up and does not select it; Enter still selects', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDrop={() => {}} onSelect={onSelect} />)
    const handle = await pickUp(user, 'Beta')
    await drop(user, handle, '{Enter}')
    expect(onSelect).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('b')
  })

  it('without `drag` Space selects the row', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<Harness onDrop={() => {}} onSelect={onSelect} draggable={false} />)
    act(() => screen.getByRole('treeitem', { name: 'Alpha' }).focus())
    await user.keyboard(' ')
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('a')
  })
})

describe('F002-W2 pointer drag from anywhere on the row (web 3.3.0)', () => {
  beforeEach(stubLayout)

  it('a plain click selects the row; past the threshold the row is lifted and dropped where the pointer is', async () => {
    const onSelect = vi.fn()
    const onDrop = vi.fn()
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<Harness onDrop={onDrop} onSelect={onSelect} />)
    const row = screen.getByRole('treeitem', { name: 'Alpha' })
    await user.click(row)
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('a')
    onSelect.mockClear()

    // stubLayout stacks 36 px rows in DOM order and counts dnd-kit's placeholder (Alpha's slot) as a
    // row, so y 100 is the bottom half of Beta: Alpha lands before Gamma.
    await user.pointer([
      { keys: '[MouseLeft>]', target: row, coords: { clientX: 20, clientY: 10 } },
      { coords: { clientX: 20, clientY: 40 } },
      { coords: { clientX: 20, clientY: 100 } },
    ])
    await screen.findByText(/^Picked up Alpha/)
    await waitFor(() => expect(lines()).toEqual([['c', 'before']]))
    await user.pointer({ keys: '[/MouseLeft]' })
    await screen.findByText(/^Dropped Alpha/)
    expect(onDrop).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'a', to: 1 }))
    expect(onSelect).not.toHaveBeenCalled()
  })
})
