import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseStringArray, readStored, STORAGE_KEYS, writeStored } from './storage'

const parseNumber = (raw: unknown) => (typeof raw === 'number' ? raw : undefined)

describe('W-04 storage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses the collection: prefix for every key', () => {
    expect(STORAGE_KEYS.treeExpanded).toBe('collection:tree-expanded')
    expect(STORAGE_KEYS.sidebar).toBe('collection:sidebar')
  })

  it('round-trips a JSON value', () => {
    writeStored('collection:test', { a: [1, 2] })
    expect(localStorage.getItem('collection:test')).toBe('{"a":[1,2]}')
    expect(readStored('collection:test', (raw) => raw, null)).toEqual({ a: [1, 2] })
  })

  it('returns the fallback when nothing is stored', () => {
    expect(readStored('collection:missing', parseNumber, 7)).toBe(7)
  })

  it('returns the fallback for garbage JSON', () => {
    localStorage.setItem('collection:test', '{not json')
    expect(readStored('collection:test', parseNumber, 7)).toBe(7)
  })

  it('returns the fallback when the parser rejects the value', () => {
    localStorage.setItem('collection:test', '"text"')
    expect(readStored('collection:test', parseNumber, 7)).toBe(7)
  })

  it('returns the fallback when the parser throws', () => {
    localStorage.setItem('collection:test', '1')
    expect(
      readStored(
        'collection:test',
        () => {
          throw new Error('boom')
        },
        7,
      ),
    ).toBe(7)
  })

  it('does not throw when reading is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(readStored('collection:test', parseNumber, 7)).toBe(7)
  })

  it('does not throw when writing is blocked or the quota is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => writeStored('collection:test', 1)).not.toThrow()
  })
})

describe('parseStringArray', () => {
  it.each([
    ['an array of ids', ['a', 'b'], ['a', 'b']],
    ['an empty array', [], []],
    ['drops non-string entries', ['a', 1, null, { id: 'b' }, 'c'], ['a', 'c']],
    ['keeps duplicates as stored', ['a', 'a'], ['a', 'a']],
    ['a string is rejected', 'a', undefined],
    ['an object is rejected', { a: true }, undefined],
    ['null is rejected', null, undefined],
    ['undefined is rejected', undefined, undefined],
  ])('%s', (_name, raw, expected) => {
    expect(parseStringArray(raw)).toEqual(expected)
  })
})
