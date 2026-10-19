import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'
import { Car, Tag, typeIcons, typeLabels, type ItemType } from './icons'

const types: [ItemType, string][] = [
  [null, 'No type'],
  ['book', 'Books'],
  ['movie', 'Movies'],
  ['tv_show', 'TV shows'],
  ['vehicle', 'Vehicles'],
  ['wishlist', 'Wishlist'],
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

  it('covers the five built-in types, with Vehicles on the car and Wishlist on the price tag', () => {
    expect(Object.keys(typeLabels).sort()).toEqual([
      'book',
      'movie',
      'tv_show',
      'vehicle',
      'wishlist',
    ])
    expect(Object.keys(typeIcons).sort()).toEqual(Object.keys(typeLabels).sort())
    expect(typeIcons.vehicle).toBe(Car)
    expect(typeIcons.wishlist).toBe(Tag)
  })
})
