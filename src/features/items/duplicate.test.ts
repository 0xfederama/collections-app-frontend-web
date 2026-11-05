import { describe, expect, it } from 'vitest'
import { duplicateTitleMessage } from './duplicate'

describe('F-026 W7 duplicateTitleMessage', () => {
  it.each([
    ['movie', 'This movie is already in this list.'],
    ['tv_show', 'This show is already in this list.'],
    ['book', 'This book is already in this list.'],
    ['vehicle', 'An item with this title is already in this list.'],
    ['wishlist', 'An item with this title is already in this list.'],
    [null, 'An item with this title is already in this list.'],
    [undefined, 'An item with this title is already in this list.'],
  ] as const)('%j reads %j', (type, message) => {
    expect(duplicateTitleMessage(type)).toBe(message)
  })
})
