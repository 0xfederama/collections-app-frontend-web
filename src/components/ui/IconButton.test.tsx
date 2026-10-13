import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from './IconButton'
import { Plus } from './icons'

describe('IconButton', () => {
  it('is named by aria-label', () => {
    render(
      <IconButton aria-label="Add item">
        <Plus aria-hidden />
      </IconButton>,
    )
    expect(screen.getByRole('button', { name: 'Add item' })).toBeInTheDocument()
  })

  it('has a 44px (size-11) hit area', () => {
    render(
      <IconButton aria-label="Add item">
        <Plus aria-hidden />
      </IconButton>,
    )
    expect(screen.getByRole('button', { name: 'Add item' })).toHaveClass('size-11')
  })

  it('fires onClick and respects disabled', async () => {
    const onClick = vi.fn()
    const { rerender } = render(
      <IconButton aria-label="Add item" onClick={onClick}>
        <Plus aria-hidden />
      </IconButton>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add item' }))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(
      <IconButton aria-label="Add item" onClick={onClick} disabled>
        <Plus aria-hidden />
      </IconButton>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add item' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
