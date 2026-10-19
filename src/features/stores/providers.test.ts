import { describe, expect, it } from 'vitest'
import { joinStoreKeys, parseStoreKeys, storeName } from './providers'

const providers = [
  { key: 'amazon' as const, name: 'Amazon' },
  { key: 'bookshop' as const, name: 'Bookshop.org' },
]

describe('F016-W4 store names', () => {
  it('shows the display name of a store key from the provider list', () => {
    expect(storeName(providers, 'bookshop')).toBe('Bookshop.org')
  })

  it('reads an unknown or not yet loaded key as words, so a tile is never blank', () => {
    expect(storeName(providers, 'google_play_books')).toBe('google play books')
    expect(storeName(undefined, 'kobo')).toBe('kobo')
  })
})

describe('F016-W4 store key text', () => {
  it('parses the comma-separated text: trimmed, no empty entries, each key once, in order', () => {
    expect(parseStoreKeys(' kobo, amazon ,, kobo, ')).toEqual(['kobo', 'amazon'])
    expect(parseStoreKeys('  ,  ')).toEqual([])
  })

  it('joins keys back into the text an input holds', () => {
    expect(joinStoreKeys(['amazon', 'kobo'])).toBe('amazon, kobo')
    expect(joinStoreKeys([])).toBe('')
  })
})
