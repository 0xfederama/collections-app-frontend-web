import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StatusBarCover } from './StatusBarCover'

describe('D-141 status bar cover', () => {
  afterEach(() => Object.defineProperty(window, 'scrollY', { value: 0, configurable: true }))

  it('is solid at the top and hidden once the page scrolls', () => {
    const { container } = render(<StatusBarCover />)
    const cover = container.firstElementChild
    expect(cover).not.toHaveClass('hidden')
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 200, configurable: true })
      window.dispatchEvent(new Event('scroll'))
    })
    expect(cover).toHaveClass('hidden')
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
      window.dispatchEvent(new Event('scroll'))
    })
    expect(cover).not.toHaveClass('hidden')
  })
})
