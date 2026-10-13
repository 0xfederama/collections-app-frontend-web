import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { Dialog } from './Dialog'

function setup(onOpenChange?: (o: boolean) => void) {
  render(
    <>
      <Button>Before</Button>
      <Dialog
        trigger={<Button>Open</Button>}
        title="Edit item"
        description="Change the details"
        onOpenChange={onOpenChange}
        footer={<Button>Save</Button>}
      >
        <input aria-label="Name" />
      </Dialog>
    </>,
  )
}

describe('Dialog', () => {
  it('opens from the trigger with title and description', async () => {
    const user = userEvent.setup()
    setup()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit item' })
    expect(dialog).toHaveAccessibleDescription('Change the details')
  })

  it('Tab cycles focus inside the dialog (focus trap)', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = await screen.findByRole('dialog')
    for (let i = 0; i < 8; i++) {
      await user.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
    for (let i = 0; i < 4; i++) {
      await user.tab({ shift: true })
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
  })

  it('Escape closes and restores focus to the trigger', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    setup(onOpenChange)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
    expect(trigger).toHaveFocus()
  })

  it('the Close button closes it and restores focus', async () => {
    const user = userEvent.setup()
    setup()
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await user.click(await screen.findByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('works controlled', async () => {
    render(<Dialog open title="Controlled" onOpenChange={() => {}} />)
    expect(await screen.findByRole('dialog', { name: 'Controlled' })).toBeInTheDocument()
  })
})
