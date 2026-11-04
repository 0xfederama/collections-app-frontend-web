import { describe, expect, it } from 'vitest'
import { canRefreshDetails, refreshSummary } from './refreshMessage'

describe('F025-W11 refresh details toast text', () => {
  it.each([
    [{ updated: 12, failed: 0, skipped: 0, remaining: 0 }, '12 updated', undefined, 'success'],
    [
      { updated: 12, failed: 1, skipped: 0, remaining: 0 },
      '12 updated, 1 failed',
      undefined,
      'success',
    ],
    [
      { updated: 3, failed: 0, skipped: 2, remaining: 0 },
      '3 updated, 2 skipped',
      undefined,
      'success',
    ],
    [{ updated: 0, failed: 0, skipped: 0, remaining: 0 }, '0 updated', undefined, 'success'],
    [
      { updated: 0, failed: 4, skipped: 1, remaining: 0 },
      '0 updated, 4 failed, 1 skipped',
      undefined,
      'error',
    ],
    [
      { updated: 50, failed: 0, skipped: 0, remaining: 7 },
      '50 updated',
      '7 more left, run again',
      'success',
    ],
  ] as const)('%j', (counts, title, description, kind) => {
    expect(refreshSummary(counts)).toEqual({ title, kind, ...(description ? { description } : {}) })
  })
})

describe('F025-W11 canRefreshDetails', () => {
  it.each([
    ['movie', 3, true],
    ['tv_show', 1, true],
    ['movie', 0, false],
    ['book', 5, false],
    ['vehicle', 5, false],
    [null, 5, false],
  ] as const)('%s with %i items: %s', (type, item_count, expected) => {
    expect(canRefreshDetails({ type, item_count })).toBe(expected)
  })
})
