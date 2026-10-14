import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Tooltip } from './Tooltip'

describe('Tooltip', () => {
  it('is absent until the trigger receives focus, then appears', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="Add a new item">
        <Button>Add</Button>
      </Tooltip>,
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Add' })).toHaveFocus()
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Add a new item')
  })

  it('Escape dismisses it', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="Add a new item">
        <Button>Add</Button>
      </Tooltip>,
    )
    await user.tab()
    await screen.findByRole('tooltip')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })
})
