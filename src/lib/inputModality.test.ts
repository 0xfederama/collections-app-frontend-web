import { afterEach, describe, expect, it } from 'vitest'
import { trackInputModality } from './inputModality'

describe('trackInputModality', () => {
  let stop: () => void
  afterEach(() => stop())

  it('marks the page while the pointer was the last input and clears it on a key press', () => {
    stop = trackInputModality()
    const root = document.documentElement
    expect(root).not.toHaveAttribute('data-pointer')
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    expect(root).toHaveAttribute('data-pointer')
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(root).not.toHaveAttribute('data-pointer')
  })
})
