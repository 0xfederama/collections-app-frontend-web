import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders a button with type="button" by default and fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).not.toHaveAttribute('aria-busy')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('when pending: shows a spinner, sets aria-busy, disables and does not fire click', async () => {
    const onClick = vi.fn()
    const { container } = render(
      <Button pending onClick={onClick}>
        Save
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
    expect(container.querySelector('svg.animate-spin')).toBeInTheDocument()
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('does not show a spinner when not pending', () => {
    const { container } = render(<Button>Save</Button>)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })

  it('is disabled and inert when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)('renders the %s variant', (v) => {
    render(<Button variant={v}>Go</Button>)
    expect(screen.getByRole('button', { name: 'Go' })).toBeEnabled()
  })
})
