import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KeyboardTapTarget } from './KeyboardTapTarget'

describe('roadmap 28 keyboard tap target', () => {
  const media = window.matchMedia
  beforeEach(() => {
    window.matchMedia = ((query: string) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
  })
  afterEach(() => {
    window.matchMedia = media
  })

  const field = (container: HTMLElement) =>
    container.querySelector<HTMLInputElement>('input[data-keyboard-tap]')

  it('a press on the hidden field runs the action', () => {
    const onTap = vi.fn()
    const { container } = render(
      <KeyboardTapTarget onTap={onTap}>
        <button type="button">New item</button>
      </KeyboardTapTarget>,
    )
    const input = field(container)
    expect(input).not.toBeNull()
    fireEvent.pointerDown(input!)
    input!.focus()
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('focus without a press (a dialog returning focus) goes to the visible button instead', () => {
    const onTap = vi.fn()
    const { container } = render(
      <KeyboardTapTarget onTap={onTap}>
        <button type="button">New item</button>
      </KeyboardTapTarget>,
    )
    field(container)!.focus()
    expect(onTap).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'New item' })).toHaveFocus()
  })

  it('renders no field with a fine pointer (desktop)', () => {
    window.matchMedia = media
    const { container } = render(
      <KeyboardTapTarget onTap={vi.fn()}>
        <button type="button">New item</button>
      </KeyboardTapTarget>,
    )
    expect(field(container)).toBeNull()
  })
})
