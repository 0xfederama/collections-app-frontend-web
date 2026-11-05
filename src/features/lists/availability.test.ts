import { describe, expect, it } from 'vitest'
import type { TypeDefinition } from '../items'
import { availabilityLabel, parseAvailability, supportsAvailability } from './availability'

const movie = {
  key: 'movie',
  fields: [{ key: 'streaming', type: 'streaming' }],
} as unknown as TypeDefinition
const book = { key: 'book', fields: [{ key: 'author', type: 'text' }] } as unknown as TypeDefinition

describe('F-026 W4 availability param', () => {
  it.each([
    ['available', movie, 'available'],
    ['included', movie, 'included'],
    ['other', movie, null],
    ['', movie, null],
    [null, movie, null],
    ['available', book, null],
    ['included', null, null],
    ['included', undefined, null],
  ])('parseAvailability(%j, type) is %j', (value, definition, expected) => {
    expect(parseAvailability(value, definition)).toBe(expected)
  })

  it('supportsAvailability only for types with streaming', () => {
    expect(supportsAvailability(movie)).toBe(true)
    expect(supportsAvailability(book)).toBe(false)
  })

  it.each([
    ['available', 'Available'],
    ['included', 'Available, not paid'],
    [null, null],
  ] as const)('label of %j is %j', (value, label) => {
    expect(availabilityLabel(value)).toBe(label)
  })
})
