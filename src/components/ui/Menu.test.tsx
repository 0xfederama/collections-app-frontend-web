import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { Menu } from './Menu'

function setup(onEdit = vi.fn(), onDelete = vi.fn()) {
  render(
    <Menu
      trigger={<Button>Actions</Button>}
      items={[
        { label: 'Edit', onSelect: onEdit },
        { type: 'separator' },
        { label: 'Delete', onSelect: onDelete, destructive: true },
      ]}
    />,
  )
  return { onEdit, onDelete }
}

describe('Menu', () => {
  it('opens with Enter on the trigger and shows menu items', async () => {
    const user = userEvent.setup()
    setup()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
  })

  it('opens on click', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    expect(await screen.findByRole('menu')).toBeInTheDocument()
  })

  it('arrow keys move focus between items', async () => {
    const user = userEvent.setup()
    setup()
    await user.tab()
    await user.keyboard('{Enter}')
    await screen.findByRole('menu')
    // Keyboard open focuses the first item.
    const first = screen.getByRole('menuitem', { name: 'Edit' })
    expect(first).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(first).toHaveFocus()
  })

  it('Escape closes the menu and restores focus to the trigger', async () => {
    const user = userEvent.setup()
    setup()
    await user.tab()
    await user.keyboard('{Enter}')
    await screen.findByRole('menu')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actions' })).toHaveFocus()
  })

  it('Enter on an item calls its onSelect and closes the menu', async () => {
    const user = userEvent.setup()
    const { onEdit, onDelete } = setup()
    await user.tab()
    await user.keyboard('{Enter}')
    await screen.findByRole('menu')
    await user.keyboard('{Enter}')
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('clicking a destructive item calls onSelect and renders with danger styling', async () => {
    const user = userEvent.setup()
    const { onDelete } = setup()
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    const del = await screen.findByRole('menuitem', { name: 'Delete' })
    expect(del).toHaveClass('text-danger-text')
    expect(screen.getByRole('menuitem', { name: 'Edit' })).not.toHaveClass('text-danger-text')
    await user.click(del)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('does not call onSelect for a disabled item', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <Menu
        trigger={<Button>Actions</Button>}
        items={[{ label: 'Archive', onSelect, disabled: true }]}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    const item = await screen.findByRole('menuitem', { name: 'Archive' })
    expect(item).toHaveAttribute('aria-disabled', 'true')
    await user.click(item)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
