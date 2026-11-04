import { describe, expect, it } from 'vitest'
import { naturalWidth, visibleCount } from './tileFit'

describe('F-025 visibleCount', () => {
  // tile 20, gap 6: n tiles take 20n + 6(n-1) px.
  it.each([
    { available: 0, total: 3, expected: 0 },
    { available: 19, total: 3, expected: 0 },
    { available: 20, total: 1, expected: 1 },
    { available: 20, total: 3, expected: 0 }, // one slot only: just "+3"
    { available: 46, total: 3, expected: 1 }, // 2 fit, one is the +N
    { available: 72, total: 3, expected: 3 }, // all 3 fit exactly
    { available: 71, total: 3, expected: 1 }, // 2 fit -> 1 + "+2"
    { available: 500, total: 3, expected: 3 },
    { available: 100, total: 0, expected: 0 },
    { available: 500, total: 4, expected: 4 }, // 4 or fewer: all of them
    { available: 500, total: 5, expected: 3 }, // more than 4: 3 + "+2"
    { available: 500, total: 9, expected: 3 },
    { available: 98, total: 5, expected: 3 }, // 4 fit by width -> 3 + the +N
    { available: 72, total: 5, expected: 2 }, // width is smaller than the cap
    { available: 20, total: 5, expected: 0 },
  ])('available $available, total $total -> $expected', ({ available, total, expected }) => {
    expect(visibleCount(available, 20, 6, total)).toBe(expected)
  })
})

describe('F-025 naturalWidth', () => {
  it.each([
    { total: 0, expected: 0 },
    { total: 1, expected: 20 },
    { total: 3, expected: 72 },
  ])('$total tiles -> $expected', ({ total, expected }) => {
    expect(naturalWidth(20, 6, total)).toBe(expected)
  })
})
