import { act, screen } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { mockViewport } from './test-utils'

/*
 * Keyboard drag (focus the row, Space, ArrowDown, Space) in jsdom. dnd-kit
 * measures layout and uses browser APIs jsdom lacks, so these tests stub them: every treeitem gets
 * a 36px-tall rect stacked in DOM order, and the missing observers/animation APIs are no-ops.
 */

const ROW_HEIGHT = 36

export function stubLayout() {
  mockViewport(1024) // dnd-kit reads matchMedia (prefers-reduced-motion)
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    },
  )
  Element.prototype.getAnimations = () => []
  Element.prototype.animate = () =>
    ({
      finished: Promise.resolve(),
      cancel() {},
      finish() {},
      commitStyles() {},
      addEventListener() {},
      removeEventListener() {},
    }) as unknown as Animation
  ;(document as unknown as { getAnimations: () => [] }).getAnimations = () => []
  const elementAt = (_x: number, y: number) =>
    document.querySelectorAll('[role="treeitem"]')[Math.floor(y / ROW_HEIGHT)] ?? document.body
  ;(document as unknown as { elementFromPoint: unknown }).elementFromPoint = elementAt
  ;(document as unknown as { elementsFromPoint: unknown }).elementsFromPoint = (
    x: number,
    y: number,
  ) => [elementAt(x, y)]
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const isRow = this.getAttribute('role') === 'treeitem'
    // Rows are stacked in DOM order; everything else (html, body, the list) is a big viewport.
    const top = isRow
      ? [...document.querySelectorAll('[role="treeitem"]')].indexOf(this) * ROW_HEIGHT
      : 0
    const height = isRow ? ROW_HEIGHT : 2000
    return {
      x: 0,
      y: top,
      top,
      left: 0,
      width: 200,
      height,
      right: 200,
      bottom: top + height,
      toJSON() {},
    } as DOMRect
  })
}

// The whole row is the drag handle (no grip), so the "handle" is the focused treeitem itself.
export const handleOf = (name: string) => screen.getByRole('treeitem', { name })

/**
 * Picks a row up with Space and waits until dnd-kit says the drag is active, so later keys are not
 * racing its asynchronous setup.
 */
export async function pickUp(user: ReturnType<typeof userEvent.setup>, name: string) {
  const handle = handleOf(name)
  act(() => handle.focus())
  await user.keyboard(' ')
  await screen.findByText(/^Picked up /)
  return handle
}

export async function drop(user: ReturnType<typeof userEvent.setup>, _row: HTMLElement, key = ' ') {
  await user.keyboard(key)
  await screen.findByText(/^(Dropped|Move cancelled)/)
}
