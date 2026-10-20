import { describe, expect, it } from 'vitest'
import { queryEscape } from './escape'

describe('queryEscape (Go url.QueryEscape)', () => {
  it.each([
    ['plain letters and digits', 'Dune2021', 'Dune2021'],
    ['space becomes +', 'The Office', 'The+Office'],
    ['ampersand', 'Tom & Jerry', 'Tom+%26+Jerry'],
    ['hash', 'C# course', 'C%23+course'],
    ['double quote', 'say "hi"', 'say+%22hi%22'],
    ['single quote', "Ocean's Eleven", 'Ocean%27s+Eleven'],
    ['exclamation mark', 'Hey!', 'Hey%21'],
    ['parentheses', '(Extended)', '%28Extended%29'],
    ['asterisk', 'a*b', 'a%2Ab'],
    ['tilde stays bare', 'a~b', 'a~b'],
    ['non-ASCII is UTF-8 percent-encoded', 'Città', 'Citt%C3%A0'],
    ['plus sign', 'a+b', 'a%2Bb'],
  ])('%s', (_name, input, expected) => {
    expect(queryEscape(input)).toBe(expected)
  })
})
