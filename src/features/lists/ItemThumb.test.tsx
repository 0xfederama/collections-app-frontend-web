import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ItemThumb } from './ItemThumb'

describe('F008-W13 item initials', () => {
  it('draws the same letter tile for every kind, with no kind symbol', () => {
    const { container } = render(
      <>
        {(['movie', 'car', 'generic'] as const).map((kind) => (
          <ItemThumb key={kind} item={{ title: 'alien', kind, image: null }} className="size-9" />
        ))}
      </>,
    )
    const tiles = screen.getAllByTestId('fallback-tile')
    expect(tiles).toHaveLength(3)
    for (const tile of tiles) {
      expect(tile).toHaveTextContent(/^A$/)
      expect(tile.className).toBe(tiles[0]?.className)
    }
    expect(container.querySelector('svg')).toBeNull()
  })
})
