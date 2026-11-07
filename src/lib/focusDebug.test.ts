import { afterEach, describe, expect, it } from 'vitest'
import { focusDebugEnabled, focusNote, setFocusDebug, startFocusDebug } from './focusDebug'

const overlay = () =>
  document.body.querySelector<HTMLDivElement>('div[aria-hidden="true"].font-mono')

describe('roadmap 28 focus diagnostics', () => {
  afterEach(() => setFocusDebug(false))

  it('is off by default and notes are no-ops', () => {
    startFocusDebug()
    focusNote('ignored')
    expect(focusDebugEnabled()).toBe(false)
    expect(overlay()).toBeNull()
  })

  it('logs focus changes and notes once switched on, and goes away when off', () => {
    setFocusDebug(true)
    const input = document.createElement('input')
    input.setAttribute('aria-label', 'Title')
    document.body.append(input)
    input.focus()
    focusNote('hand-off: ok')
    expect(overlay()?.textContent).toMatch(/in {2}input "Title"/)
    expect(overlay()?.textContent).toMatch(/hand-off: ok/)
    setFocusDebug(false)
    expect(overlay()).toBeNull()
    input.remove()
  })
})
