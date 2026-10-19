import { BookOpen } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { typeIconFor } from './icons'

describe('F016 type icons', () => {
  it('a book list defaults to the open book', () => {
    expect(typeIconFor('book')).toBe(BookOpen)
  })
})
