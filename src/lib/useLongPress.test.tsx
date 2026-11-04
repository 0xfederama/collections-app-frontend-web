import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLongPress } from './useLongPress'

function Row({ onLongPress, onClick }: { onLongPress: () => void; onClick?: () => void }) {
  const press = useLongPress({ onLongPress })
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- test fixture for pointer handlers
    <div data-testid="row" {...press} onClick={onClick}>
      Row <button>inner</button>
    </div>
  )
}

const down = (el: Element, pointerType: string, x = 10, y = 10) =>
  fireEvent.pointerDown(el, { pointerType, clientX: x, clientY: y })

describe('F-025 W5 useLongPress', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // pointerType, hold (ms), then what happens before the end: nothing, a move to (x, y), a pointercancel
  const cases: [string, string, number, { x: number; y: number } | 'cancel' | null, boolean][] = [
    ['touch hold still past 500 ms', 'touch', 600, null, true],
    ['touch hold under 500 ms', 'touch', 400, null, false],
    ['pen hold still', 'pen', 600, null, true],
    ['mouse hold never fires', 'mouse', 900, null, false],
    ['touch, finger drifts 5 px', 'touch', 600, { x: 13, y: 14 }, true],
    ['touch, finger moves 30 px (swipe or drag)', 'touch', 600, { x: 10, y: 40 }, false],
    ['touch, browser cancels the pointer (scroll)', 'touch', 600, 'cancel', false],
  ]
  it.each(cases)('%s', (_name, pointerType, hold, during, fires) => {
    const onLongPress = vi.fn()
    render(<Row onLongPress={onLongPress} />)
    const row = screen.getByTestId('row')
    down(row, pointerType)
    act(() => void vi.advanceTimersByTime(hold / 2))
    if (during === 'cancel') fireEvent.pointerCancel(row)
    else if (during) fireEvent.pointerMove(window, { clientX: during.x, clientY: during.y })
    act(() => void vi.advanceTimersByTime(hold / 2))
    expect(onLongPress).toHaveBeenCalledTimes(fires ? 1 : 0)
  })

  it('lifting the finger early cancels', () => {
    const onLongPress = vi.fn()
    render(<Row onLongPress={onLongPress} />)
    down(screen.getByTestId('row'), 'touch')
    act(() => void vi.advanceTimersByTime(300))
    fireEvent.pointerUp(window)
    act(() => void vi.advanceTimersByTime(600))
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('a press on a control inside the row is not a long press', () => {
    const onLongPress = vi.fn()
    render(<Row onLongPress={onLongPress} />)
    down(screen.getByRole('button', { name: 'inner' }), 'touch')
    act(() => void vi.advanceTimersByTime(700))
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('swallows the click that ends a long press, but not the next one', () => {
    const onClick = vi.fn()
    render(<Row onLongPress={() => {}} onClick={onClick} />)
    const row = screen.getByTestId('row')
    down(row, 'touch')
    act(() => void vi.advanceTimersByTime(600))
    fireEvent.click(row)
    expect(onClick).not.toHaveBeenCalled()
    fireEvent.click(row)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('cancels the native context menu after a touch press, not after a mouse press', () => {
    render(<Row onLongPress={() => {}} />)
    const row = screen.getByTestId('row')
    down(row, 'touch')
    expect(fireEvent.contextMenu(row)).toBe(false)
    fireEvent.pointerUp(window)
    down(row, 'mouse')
    expect(fireEvent.contextMenu(row)).toBe(true)
  })
})
