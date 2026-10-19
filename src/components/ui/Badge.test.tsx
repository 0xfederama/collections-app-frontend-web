import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'
import { typeLabels, type ItemType } from './icons'

const types: [ItemType, string][] = [
  [null, 'No type'],
  ['movie', 'Movie'],
  ['tv_show', 'TV show'],
  ['motorcycle', 'Motorcycle'],
  ['car', 'Car'],
  ['camera', 'Camera'],
]

describe('Badge', () => {
  it.each(types)('shows the label for type %s', (type, label) => {
    const { container } = render(<Badge type={type} />)
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('F018 shows the list glyph for no type', () => {
    const { container } = render(<Badge type={null} />)
    expect(container.querySelector('svg.lucide-list')).toBeInTheDocument()
    expect(container.querySelector('svg.lucide-tag')).not.toBeInTheDocument()
  })

  it('covers the five built-in types', () => {
    expect(Object.keys(typeLabels)).toHaveLength(5)
  })
})
