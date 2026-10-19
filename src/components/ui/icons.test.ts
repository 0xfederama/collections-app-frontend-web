import { BookOpen, List, Tag } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { typeIconFor } from './icons'

describe('F016 type icons', () => {
  it('a book list defaults to the open book', () => {
    expect(typeIconFor('book')).toBe(BookOpen)
  })
})

describe('F018 no-type icon', () => {
  it('a list with no type shows the classic list glyph, not the price tag', () => {
    expect(typeIconFor(null)).toBe(List)
    expect(typeIconFor(null)).not.toBe(Tag)
  })

  it('an unknown custom type falls back to the list glyph too', () => {
    expect(typeIconFor('podcast')).toBe(List)
  })
})
