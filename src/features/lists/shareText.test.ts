import { describe, expect, it } from 'vitest'
import { buildShareText } from './shareText'

const items = (...titles: string[]) => titles.map((title) => ({ title }))

describe('roadmap 40 buildShareText', () => {
  it.each([
    { name: 'empty', input: [], expected: '' },
    { name: 'one item', input: items('Alien'), expected: '* Alien' },
    { name: 'order preserved', input: items('b', 'a', 'c'), expected: '* b\n* a\n* c' },
    {
      name: 'special characters and emoji verbatim',
      input: items('Amélie & "Co" <3', '🎬 Heat  (1995)', '* star', 'a\\b'),
      expected: '* Amélie & "Co" <3\n* 🎬 Heat  (1995)\n* * star\n* a\\b',
    },
  ])('$name', ({ input, expected }) => {
    expect(buildShareText(input)).toBe(expected)
  })

  it('handles more than 200 items', () => {
    const many = Array.from({ length: 250 }, (_, i) => ({ title: `T${i}` }))
    const lines = buildShareText(many).split('\n')
    expect(lines).toHaveLength(250)
    expect(lines[0]).toBe('* T0')
    expect(lines[249]).toBe('* T249')
  })

  it('accepts a per-item formatter', () => {
    expect(buildShareText(items('a', 'b'), { formatItem: (i) => `- ${i.title}` })).toBe('- a\n- b')
  })
})
