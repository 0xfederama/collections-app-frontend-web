import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tree, type TreeNodeBase } from './Tree'
import type { SortableSlot } from './sortable'

interface N extends TreeNodeBase {
  name: string
  children?: N[]
}

const nodes: N[] = [
  { id: 'a', name: 'Alpha' },
  { id: 'b', name: 'Beta' },
  { id: 'c', name: 'Gamma' },
]

function Harness({
  onSelect = () => {},
  onAction = () => {},
  sortable,
}: {
  onSelect?: (id: string) => void
  onAction?: (name: string) => void
  sortable?: (node: N) => SortableSlot | undefined
}) {
  return (
    <Tree
      aria-label="Collections"
      nodes={nodes}
      expanded={new Set()}
      onExpandedChange={() => {}}
      selected={null}
      onSelectedChange={onSelect}
      sortable={sortable}
      renderRow={(n) => (
        <>
          <a href={`#${n.id}`} tabIndex={-1} onClick={(e) => e.stopPropagation()}>
            {n.name}
          </a>
          {/* Like the real row actions: the click does not reach the row. */}
          <button
            type="button"
            aria-label={`Actions for ${n.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onAction(n.name)
            }}
          />
        </>
      )}
    />
  )
}

const item = (name: string) => screen.getByRole('treeitem', { name: new RegExp(`^${name}`) })
const tabbable = () =>
  screen
    .getAllByRole('treeitem')
    .filter((el) => el.tabIndex === 0)
    .map((el) => el.getAttribute('data-tree-id'))

describe('AT-03 tree row focus (web): roving tabindex follows inner controls', () => {
  it('starts with the first row as the single tab stop', () => {
    render(<Harness />)
    expect(tabbable()).toEqual(['a'])
  })

  it("clicking a row's inner link moves the tab stop to that row", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(within(item('Beta')).getByRole('link', { name: 'Beta' }))
    expect(tabbable()).toEqual(['b'])
    expect(item('Alpha')).toHaveAttribute('tabindex', '-1')
  })

  it("focusing a row's inner button also moves the tab stop (keyboard users tabbing into it)", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Actions for Gamma' }))
    expect(tabbable()).toEqual(['c'])
  })

  it('after clicking a link, arrow keys continue from that row', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(within(item('Beta')).getByRole('link', { name: 'Beta' }))
    item('Beta').focus()
    await user.keyboard('{ArrowDown}')
    expect(item('Gamma')).toHaveFocus()
    expect(tabbable()).toEqual(['c'])
  })
})

describe('AT-03 tree row focus (web): keys inside a row control are not tree keys', () => {
  it('Enter and Space on an inner button run the button, not the row select', async () => {
    const onSelect = vi.fn()
    const onAction = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSelect={onSelect} onAction={onAction} />)
    const button = screen.getByRole('button', { name: 'Actions for Beta' })
    button.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(onAction).toHaveBeenCalledTimes(2)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('arrow keys inside an inner button do not move the tree focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const button = screen.getByRole('button', { name: 'Actions for Alpha' })
    button.focus()
    await user.keyboard('{ArrowDown}{End}')
    expect(button).toHaveFocus()
    expect(tabbable()).toEqual(['a'])
  })

  it('Enter on the treeitem itself still selects it', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<Harness onSelect={onSelect} />)
    item('Alpha').focus()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('a')
  })

  it('arrow keys on the reorder handle do not move the tree focus', async () => {
    const user = userEvent.setup()
    render(
      <Harness
        sortable={(n) => ({
          group: 'g',
          index: nodes.findIndex((x) => x.id === n.id),
          size: nodes.length,
          label: n.name,
        })}
      />,
    )
    const handle = screen.getByRole('button', { name: 'Reorder Beta' })
    act(() => handle.focus())
    expect(tabbable()).toEqual(['b'])
    await user.keyboard('{ArrowDown}{Home}')
    expect(handle).toHaveFocus()
    expect(tabbable()).toEqual(['b'])
  })
})
