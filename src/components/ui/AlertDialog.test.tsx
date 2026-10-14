import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AlertDialog } from './AlertDialog'
import { Button } from './Button'

function setup(onConfirm = vi.fn(), extra: { destructive?: boolean } = {}) {
  render(
    <AlertDialog
      trigger={<Button>Delete</Button>}
      title="Delete collection?"
      description="This cannot be undone."
      confirmLabel="Delete forever"
      onConfirm={onConfirm}
      {...extra}
    />,
  )
  return onConfirm
}

describe('AlertDialog', () => {
  it('opens as an alertdialog with title and description', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete collection?' })
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.')
  })

  it('focuses Cancel first', async () => {
    const user = userEvent.setup()
    setup(vi.fn(), { destructive: true })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await screen.findByRole('alertdialog')
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('has no close icon', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await screen.findByRole('alertdialog')
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button').filter((b) => !b.closest('[aria-hidden]'))).toHaveLength(2)
  })

  it('confirm calls onConfirm and closes', async () => {
    const user = userEvent.setup()
    const onConfirm = setup()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(await screen.findByRole('button', { name: 'Delete forever' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('Cancel closes without confirming and restores focus to the trigger', async () => {
    const user = userEvent.setup()
    const onConfirm = setup()
    const trigger = screen.getByRole('button', { name: 'Delete' })
    await user.click(trigger)
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('Escape cancels', async () => {
    const user = userEvent.setup()
    const onConfirm = setup()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
