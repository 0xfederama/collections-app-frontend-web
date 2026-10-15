import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'
import { kindLabels, type ItemKind } from './icons'

const kinds: [ItemKind, string][] = [
  ['generic', 'Item'],
  ['movie', 'Movie'],
  ['tv_show', 'TV show'],
  ['motorcycle', 'Motorcycle'],
  ['car', 'Car'],
  ['camera', 'Camera'],
]

describe('Badge', () => {
  it.each(kinds)('shows the label for kind %s', (kind, label) => {
    const { container } = render(<Badge kind={kind} />)
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('covers all six kinds', () => {
    expect(Object.keys(kindLabels)).toHaveLength(6)
  })
})
