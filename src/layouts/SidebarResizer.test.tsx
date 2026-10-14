import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SidebarResizer } from './SidebarResizer'

function setup(width = 280) {
  const onWidthChange = vi.fn()
  render(<SidebarResizer width={width} onWidthChange={onWidthChange} controls="sidebar" />)
  return { onWidthChange, separator: screen.getByRole('separator', { name: 'Resize sidebar' }) }
}

describe('W-04 SidebarResizer', () => {
  it('is a focusable vertical separator with value, min and max', () => {
    const { separator } = setup(300)
    expect(separator).toHaveAttribute('aria-orientation', 'vertical')
    expect(separator).toHaveAttribute('aria-valuenow', '300')
    expect(separator).toHaveAttribute('aria-valuemin', '220')
    expect(separator).toHaveAttribute('aria-valuemax', '400')
    expect(separator).toHaveAttribute('aria-controls', 'sidebar')
    expect(separator).toHaveAttribute('tabindex', '0')
  })

  it.each([
    ['{ArrowRight}', 280, 296],
    ['{ArrowLeft}', 280, 264],
    ['{Home}', 280, 220],
    ['{End}', 280, 400],
    ['{ArrowLeft}', 220, 220],
    ['{ArrowLeft}', 225, 220],
    ['{ArrowRight}', 400, 400],
    ['{ArrowRight}', 392, 400],
  ])('%s at %ipx asks for %ipx (clamped to 220–400)', async (key, from, to) => {
    const user = userEvent.setup()
    const { onWidthChange, separator } = setup(from)
    separator.focus()
    await user.keyboard(key)
    expect(onWidthChange).toHaveBeenCalledWith(to)
  })

  it('ignores other keys', async () => {
    const user = userEvent.setup()
    const { onWidthChange, separator } = setup()
    separator.focus()
    await user.keyboard('a{ArrowUp}{ArrowDown}{Enter}')
    expect(onWidthChange).not.toHaveBeenCalled()
  })

  it('resizes by dragging, relative to where the drag started, and clamps', () => {
    const { onWidthChange, separator } = setup(280)
    fireEvent.pointerDown(separator, { pointerId: 1, clientX: 280 })
    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 320 })
    expect(onWidthChange).toHaveBeenLastCalledWith(320)
    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 1000 })
    expect(onWidthChange).toHaveBeenLastCalledWith(400)
    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 0 })
    expect(onWidthChange).toHaveBeenLastCalledWith(220)
  })

  it('does not resize on pointer move without a press, or after release', () => {
    const { onWidthChange, separator } = setup(280)
    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 400 })
    expect(onWidthChange).not.toHaveBeenCalled()

    fireEvent.pointerDown(separator, { pointerId: 1, clientX: 280 })
    fireEvent.pointerUp(separator, { pointerId: 1, clientX: 280 })
    fireEvent.pointerMove(separator, { pointerId: 1, clientX: 400 })
    expect(onWidthChange).not.toHaveBeenCalled()
  })
})
