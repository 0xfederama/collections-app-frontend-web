import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ID, openTree, rowNames, sidebar } from '../../features/tree/treeTestKit'
import { mockViewport } from '../../test-utils'
import { Tree, type TreeNodeBase } from './Tree'

/*
 * Keyboard drag (focus the row, Space, ArrowDown, Space) in jsdom. dnd-kit
 * measures layout and uses browser APIs jsdom lacks, so these tests stub them: every treeitem gets
 * a 36px-tall rect stacked in DOM order, and the missing observers/animation APIs are no-ops.
 */

const ROW_HEIGHT = 36

function stubLayout() {
  mockViewport(1024) // dnd-kit reads matchMedia (prefers-reduced-motion)
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    },
  )
  Element.prototype.getAnimations = () => []
  Element.prototype.animate = () =>
    ({
      finished: Promise.resolve(),
      cancel() {},
      finish() {},
      commitStyles() {},
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as Animation
  ;(document as unknown as { getAnimations: () => [] }).getAnimations = () => []
  const elementAt = (_x: number, y: number) =>
    document.querySelectorAll('[role="treeitem"]')[Math.floor(y / ROW_HEIGHT)] ?? document.body
  ;(document as unknown as { elementFromPoint: unknown }).elementFromPoint = elementAt
  ;(document as unknown as { elementsFromPoint: unknown }).elementsFromPoint = (
    x: number,
    y: number,
  ) => [elementAt(x, y)]
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const isRow = this.getAttribute('role') === 'treeitem'
    // Rows are stacked in DOM order; everything else (html, body, the list) is a big viewport.
    const top = isRow
      ? [...document.querySelectorAll('[role="treeitem"]')].indexOf(this) * ROW_HEIGHT
      : 0
    const height = isRow ? ROW_HEIGHT : 2000
    return {
      x: 0,
      y: top,
      top,
      left: 0,
      width: 200,
      height,
      right: 200,
      bottom: top + height,
      toJSON() {},
    } as DOMRect
  })
}

interface N extends TreeNodeBase {
  name: string
  group: string
}

const nodes: N[] = [
  { id: 'a', name: 'Alpha', group: 'g' },
  { id: 'b', name: 'Beta', group: 'g' },
  { id: 'c', name: 'Gamma', group: 'g' },
]

function Harness({
  items = nodes,
  onReorder,
}: {
  items?: N[]
  onReorder: (move: { id: string; group: string; from: number; to: number }) => void
}) {
  const indexInGroup = (n: N) =>
    items.filter((x) => x.group === n.group).findIndex((x) => x.id === n.id)
  return (
    <Tree
      aria-label="Rows"
      nodes={items}
      expanded={new Set()}
      onExpandedChange={() => {}}
      selected={null}
      onSelectedChange={() => {}}
      sortable={(n) => ({
        group: n.group,
        index: indexInGroup(n),
        size: items.filter((x) => x.group === n.group).length,
        label: n.name,
      })}
      onReorder={onReorder}
      renderRow={(n) => <span>{n.name}</span>}
    />
  )
}

// The whole row is the drag handle (no grip), so the "handle" is the focused treeitem itself.
const handleOf = (name: string) => screen.getByRole('treeitem', { name })

/** Row ids in DOM order (dnd-kit moves the real elements while dragging; a drag clone repeats one id). */
const domOrder = () => [
  ...new Set(
    [...document.querySelectorAll('[role="treeitem"]')].map((el) =>
      el.getAttribute('data-tree-id'),
    ),
  ),
]

/**
 * Picks a row up with Space and waits until dnd-kit says the drag is active, so later keys are not
 * racing its asynchronous setup.
 */
async function pickUp(user: ReturnType<typeof userEvent.setup>, name: string) {
  const handle = handleOf(name)
  act(() => handle.focus())
  await user.keyboard(' ')
  await screen.findByText(/^Picked up /)
  return handle
}

/** Presses Arrow once and waits for the row to reach `expectedOrder` before the next key. */
async function step(
  user: ReturnType<typeof userEvent.setup>,
  key: '{ArrowDown}' | '{ArrowUp}',
  expectedOrder: string[],
) {
  await user.keyboard(key)
  await waitFor(() => expect(domOrder()).toEqual(expectedOrder))
}

async function drop(user: ReturnType<typeof userEvent.setup>, _row: HTMLElement, key = ' ') {
  await user.keyboard(key)
  await screen.findByText(/^(Dropped|Move cancelled)/)
}

describe('AT-21 keyboard drag reorder (web)', () => {
  beforeEach(stubLayout)

  it('Space, ArrowDown, Space reports one move from index 0 to 1', async () => {
    const onReorder = vi.fn()
    const user = userEvent.setup()
    render(<Harness onReorder={onReorder} />)
    const handle = await pickUp(user, 'Alpha')
    await step(user, '{ArrowDown}', ['b', 'a', 'c'])
    await drop(user, handle)
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(onReorder).toHaveBeenCalledWith({ id: 'a', group: 'g', from: 0, to: 1 })
  })

  it('two ArrowDown presses move two places', async () => {
    const onReorder = vi.fn()
    const user = userEvent.setup()
    render(<Harness onReorder={onReorder} />)
    const handle = await pickUp(user, 'Alpha')
    await step(user, '{ArrowDown}', ['b', 'a', 'c'])
    await step(user, '{ArrowDown}', ['b', 'c', 'a'])
    await drop(user, handle, '{Enter}')
    expect(onReorder).toHaveBeenCalledExactlyOnceWith({ id: 'a', group: 'g', from: 0, to: 2 })
  })

  it('moves up with ArrowUp from the last row', async () => {
    const onReorder = vi.fn()
    const user = userEvent.setup()
    render(<Harness onReorder={onReorder} />)
    const handle = await pickUp(user, 'Gamma')
    await step(user, '{ArrowUp}', ['a', 'c', 'b'])
    await drop(user, handle)
    expect(onReorder).toHaveBeenCalledExactlyOnceWith({ id: 'c', group: 'g', from: 2, to: 1 })
  })

  it('Escape cancels the drag: no move is reported', async () => {
    const onReorder = vi.fn()
    const user = userEvent.setup()
    render(<Harness onReorder={onReorder} />)
    const handle = await pickUp(user, 'Alpha')
    await step(user, '{ArrowDown}', ['b', 'a', 'c'])
    await drop(user, handle, '{Escape}')
    expect(onReorder).not.toHaveBeenCalled()
    await waitFor(() => expect(domOrder()).toEqual(['a', 'b', 'c']))
  })

  it('dropping without moving reports nothing', async () => {
    const onReorder = vi.fn()
    const user = userEvent.setup()
    render(<Harness onReorder={onReorder} />)
    const handle = await pickUp(user, 'Beta')
    await drop(user, handle)
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('announces the final position on drop', async () => {
    const user = userEvent.setup()
    render(<Harness onReorder={() => {}} />)
    const handle = await pickUp(user, 'Alpha')
    await step(user, '{ArrowDown}', ['b', 'a', 'c'])
    await drop(user, handle)
    expect(await screen.findByText(/^Dropped Alpha at position 2 of 3\./)).toBeInTheDocument()
  })

  it('describes the keyboard instructions for the row', async () => {
    render(<Harness onReorder={() => {}} />)
    await waitFor(() =>
      expect(handleOf('Alpha')).toHaveAccessibleDescription(/Press Space to pick the row up/),
    )
  })

  it('rows of different groups never swap places', async () => {
    const onReorder = vi.fn()
    const user = userEvent.setup()
    const items: N[] = [
      { id: 'f1', name: 'Folder one', group: 'folders' },
      { id: 'f2', name: 'Folder two', group: 'folders' },
      { id: 'l1', name: 'List one', group: 'lists' },
      { id: 'l2', name: 'List two', group: 'lists' },
    ]
    render(<Harness items={items} onReorder={onReorder} />)
    const handle = await pickUp(user, 'Folder two')
    await user.keyboard('{ArrowDown}')
    await drop(user, handle)
    expect(domOrder()).toEqual(['f1', 'f2', 'l1', 'l2'])
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('Space picks a row up and does not select it; Enter still selects', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(
      <Tree
        aria-label="Rows"
        nodes={nodes}
        expanded={new Set()}
        onExpandedChange={() => {}}
        selected={null}
        onSelectedChange={onSelect}
        sortable={(n) => ({ group: 'g', index: nodes.indexOf(n), size: 3, label: n.name })}
        renderRow={(n) => <span>{n.name}</span>}
      />,
    )
    const handle = await pickUp(user, 'Beta')
    await drop(user, handle, '{Enter}')
    expect(onSelect).not.toHaveBeenCalled()
    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('b')
  })

  it('rows without a slot cannot be picked up: Space selects them', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(
      <Tree
        aria-label="Plain"
        nodes={nodes}
        expanded={new Set()}
        onExpandedChange={() => {}}
        selected={null}
        onSelectedChange={onSelect}
        renderRow={(n) => <span>{n.name}</span>}
      />,
    )
    act(() => screen.getByRole('treeitem', { name: 'Alpha' }).focus())
    await user.keyboard(' ')
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('a')
  })
})

describe('F002-W2 pointer drag from anywhere on the row (web)', () => {
  beforeEach(stubLayout)

  it('a plain click selects the row; moving past the threshold drags and does not select it', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(
      <Tree
        aria-label="Rows"
        nodes={nodes}
        expanded={new Set()}
        onExpandedChange={() => {}}
        selected={null}
        onSelectedChange={onSelect}
        sortable={(n) => ({ group: 'g', index: nodes.indexOf(n), size: 3, label: n.name })}
        renderRow={(n) => <span>{n.name}</span>}
      />,
    )
    const row = screen.getByRole('treeitem', { name: 'Alpha' })
    await user.click(row)
    expect(onSelect).toHaveBeenCalledExactlyOnceWith('a')
    onSelect.mockClear()

    await user.pointer([
      { keys: '[MouseLeft>]', target: row, coords: { clientX: 20, clientY: 10 } },
      { coords: { clientX: 20, clientY: 40 } },
      { coords: { clientX: 20, clientY: 50 } },
    ])
    // Past the distance threshold the row is lifted (announced).
    await screen.findByText(/^Picked up Alpha/)
    await user.pointer({ keys: '[/MouseLeft]' })
    await screen.findByText(/^Dropped Alpha/)
    expect(onSelect).not.toHaveBeenCalled()
  })
})

describe('AT-21 keyboard drag in the sidebar (web)', () => {
  beforeEach(stubLayout)

  it('dragging a root folder one place down PUTs the full new order', async () => {
    const { user, backend } = await openTree()
    const handle = await pickUp(user, 'Media')
    await user.keyboard('{ArrowDown}')
    await drop(user, handle)

    await waitFor(() => expect(backend.writes('PUT')).toHaveLength(1))
    expect(backend.writes('PUT')[0]).toMatchObject({
      path: '/api/v1/folders/order',
      body: { parent_folder_id: null, ids: [ID.vehicles, ID.media, ID.gear, ID.empty] },
    })
    await waitFor(() =>
      expect(
        within(sidebar())
          .getAllByRole('treeitem')
          .map((row) => row.getAttribute('data-tree-id'))
          .filter((rowId) => [ID.media, ID.vehicles].includes(rowId ?? ''))
          .join(),
      ).toBe([ID.vehicles, ID.media].join()),
    )
    expect(rowNames()).toContain('Media')
  })
})
