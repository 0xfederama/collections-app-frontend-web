import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Drawer } from './Drawer'

describe('Drawer', () => {
  it('opens from its trigger as a dialog with a title and content', async () => {
    const user = userEvent.setup()
    render(
      <Drawer trigger={<Button>Menu</Button>} title="Collections" description="Browse">
        <p>Drawer body</p>
      </Drawer>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(await screen.findByRole('dialog', { name: 'Collections' })).toBeInTheDocument()
    expect(screen.getByText('Drawer body')).toBeInTheDocument()
  })

  it('Escape closes it and focus returns to the trigger', async () => {
    const user = userEvent.setup()
    render(
      <Drawer trigger={<Button>Menu</Button>} title="Collections">
        <p>Body</p>
      </Drawer>,
    )
    const trigger = screen.getByRole('button', { name: 'Menu' })
    await user.click(trigger)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('anchors to the requested side', async () => {
    render(<Drawer open title="Left" side="left" onOpenChange={() => {}} />)
    expect(await screen.findByRole('dialog')).toHaveClass('left-0')
  })
})
