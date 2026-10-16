import { describe, expect, it } from 'vitest'
import { firstLetter } from './text'

describe('firstLetter', () => {
  it('takes the first grapheme, upper case', () => {
    expect(firstLetter('  matrix')).toBe('M')
    expect(firstLetter('éclair')).toBe('É')
    expect(firstLetter('👨‍👩‍👧 family')).toBe('👨‍👩‍👧')
    expect(firstLetter('')).toBe('?')
  })
})
