import { describe, expect, it } from 'vitest'
import { hitTest, type TreeHitRow } from './treeDrag'

// Three 36 px rows with a 2 px gap: a list, a folder, a list.
const rows: TreeHitRow[] = [
  { id: 'a', top: 100, bottom: 136, container: false },
  { id: 'b', top: 138, bottom: 174, container: true },
  { id: 'c', top: 176, bottom: 212, container: false },
]
const area = { left: 0, right: 240, top: 80, bottom: 400 }
const at = (y: number, x = 100) => hitTest(rows, area, { x, y })

describe('web 3.3.0 hitTest', () => {
  it.each([
    ['the top of a list row', 105, { rowId: 'a', zone: 'before' }],
    ['the bottom of a list row', 130, { rowId: 'a', zone: 'after' }],
    ['the top quarter of a folder', 141, { rowId: 'b', zone: 'before' }],
    ['the middle of a folder', 156, { rowId: 'b', zone: 'into' }],
    ['the bottom quarter of a folder', 171, { rowId: 'b', zone: 'after' }],
    ['the gap under a row belongs to it', 137, { rowId: 'a', zone: 'after' }],
    ['above the first row', 90, { rowId: 'a', zone: 'before' }],
    ['below the last row, inside the area', 300, { end: true }],
  ])('%s', (_name, y, expected) => {
    expect(at(y)).toEqual(expected)
  })

  it('is null outside the tree’s area', () => {
    expect(at(120, -5)).toBeNull()
    expect(at(120, 300)).toBeNull()
    expect(at(60)).toBeNull()
    expect(at(450)).toBeNull()
  })

  it('is null without rows', () => {
    expect(hitTest([], area, { x: 10, y: 100 })).toBeNull()
  })

  it('ignores the horizontal position inside the area', () => {
    expect(at(156, 5)).toEqual(at(156, 230))
  })
})
