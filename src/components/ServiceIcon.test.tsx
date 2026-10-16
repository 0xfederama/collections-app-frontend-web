import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LinkIcon, ServiceIcon, TILE_SIZE } from './ServiceIcon'

describe('F002-T5 ServiceIcon', () => {
  it.each(['Netflix', 'netflix', 'Amazon Prime Video', 'Disney Plus', 'apple tv', 'TIM Vision'])(
    'maps %s to an icon with its name',
    (name) => {
      const { container } = render(<ServiceIcon name={name} />)
      expect(screen.getByRole('img')).toHaveAttribute('title')
      expect(container.querySelector('img')).not.toBeNull()
    },
  )

  it('names the canonical service and adds ", paid" with a $ badge', () => {
    render(<ServiceIcon name="disney plus" paid />)
    expect(screen.getByRole('img', { name: 'Disney+, paid' })).toBeInTheDocument()
    expect(screen.getByTestId('paid-badge')).toHaveTextContent('$')
  })

  it('keeps the paid badge legible and neutral at the 20px list size and the item page size', () => {
    for (const size of [20, TILE_SIZE]) {
      const { unmount } = render(<ServiceIcon name="Netflix" paid size={size} />)
      const badge = screen.getByTestId('paid-badge')
      expect(parseInt(badge.style.width)).toBeGreaterThanOrEqual(16)
      expect(parseInt(badge.style.fontSize)).toBeGreaterThanOrEqual(10)
      expect(badge).toHaveClass('bg-text', 'text-surface')
      unmount()
    }
  })

  it('shows no badge when free', () => {
    render(<ServiceIcon name="YouTube" />)
    expect(screen.queryByTestId('paid-badge')).toBeNull()
  })

  it('F008-W11 every link has a real icon tile: Google and IMDb are vendored images, Website a symbol', () => {
    const { container } = render(
      <>
        {['Google', 'Letterboxd', 'IMDb', 'Reddit', 'Website'].map((n) => (
          <LinkIcon key={n} name={n} />
        ))}
      </>,
    )
    const tiles = screen.getAllByRole('img')
    expect(tiles).toHaveLength(5)
    // identical tiles: same size and classes
    for (const tile of tiles) {
      expect(tile).toHaveStyle({ width: '36px', height: '36px' })
      expect(tile.className).toBe(tiles[0]?.className)
      expect(tile).not.toHaveTextContent(/\w/)
    }
    expect(container.querySelectorAll('img')).toHaveLength(4)
    expect(screen.getByRole('img', { name: 'Website' }).querySelector('svg')).not.toBeNull()
  })
})

/** The tile wrapper: the element carrying the role and the geometry. */
const tile = (name: string | RegExp) => screen.getByRole('img', { name })

/** The mark inside a tile: the image, the symbol or the letter. */
const mark = (name: string | RegExp) => tile(name).firstElementChild!

describe('F009-W5 one tile for every icon', () => {
  it('a link icon and a streaming icon are the same tile: one size, one shape, one radius', () => {
    render(
      <>
        <LinkIcon name="Google" />
        <ServiceIcon name="Netflix" />
      </>,
    )
    const link = tile('Google')
    const streaming = tile('Netflix')
    expect(link).toHaveStyle({ width: '36px', height: '36px' })
    expect(streaming).toHaveStyle({ width: '36px', height: '36px' })
    // Same classes, so the same square shape, radius, border and neutral background.
    expect(streaming.className).toBe(link.className)
    for (const one of [link, streaming]) {
      expect(one).toHaveClass('rounded-md', 'bg-fill', 'border-border')
      // Square, never a circle: the radius is the md scale, not a pill.
      expect(one).not.toHaveClass('rounded-full', 'rounded-lg', 'rounded-xl')
    }
  })

  it('holds that geometry at the smaller list-row sizes too', () => {
    render(
      <>
        <ServiceIcon name="Netflix" size={26} />
        <LinkIcon name="IMDb" size={20} />
      </>,
    )
    const tight = tile('Netflix')
    const small = tile('IMDb')
    expect(tight).toHaveStyle({ width: '26px', height: '26px' })
    expect(small).toHaveStyle({ width: '20px', height: '20px' })
    // Only the size differs: same shape, radius, background and inner padding.
    expect(small.className).toBe(tight.className)
    expect(mark('IMDb').className).toBe(mark('Netflix').className)
  })

  it('contains the logo with even proportional padding, never cropped or overflowing', () => {
    render(<ServiceIcon name="Netflix" />)
    const inner = mark('Netflix')
    // 18% of the tile on every side, as a share and not as pixels, so it scales with the tile.
    expect(inner).toHaveClass('p-[18%]', 'size-full')
    const logo = inner.querySelector('img')!
    expect(logo).toHaveClass('size-full', 'object-contain')
    expect(logo).not.toHaveClass('object-cover')
    expect(logo).toHaveAttribute('alt', '')
  })

  it('gives the neutral Website symbol and the letter tile the same padding as a logo', () => {
    render(
      <>
        <LinkIcon name="Website" />
        <ServiceIcon name="Hulu" />
        <LinkIcon name="Google" />
      </>,
    )
    const symbol = mark('Website')
    const letter = mark('Hulu')
    const logo = mark('Google')
    expect(symbol.className).toBe(logo.className)
    expect(letter.className).toBe(logo.className)
    expect(symbol.querySelector('svg')).toHaveClass('size-full')
  })

  it('an unknown service is a letter tile in the same geometry, not a Chip', () => {
    render(
      <>
        <ServiceIcon name="Netflix" />
        <ServiceIcon name="Hulu" />
      </>,
    )
    const unknown = tile('Hulu')
    // The same tile as a known service.
    expect(unknown.className).toBe(tile('Netflix').className)
    expect(unknown).toHaveAttribute('title', 'Hulu')
    expect(unknown).not.toHaveTextContent('Hulu')
    // Only the first letter, upper case, inside the tile.
    expect(mark('Hulu')).toHaveTextContent('H')
  })

  it('an unknown paid service keeps the full accessible name and the $ badge', () => {
    render(<ServiceIcon name="Hulu" paid />)
    expect(screen.getByRole('img', { name: 'Hulu, paid' })).toBeInTheDocument()
    expect(tile('Hulu, paid')).toHaveTextContent('H')
    expect(screen.getByTestId('paid-badge')).toHaveTextContent('$')
  })

  it('an unknown link site is a letter tile too', () => {
    render(<LinkIcon name="MyAnimeList" />)
    expect(tile('MyAnimeList')).toHaveAttribute('title', 'MyAnimeList')
    expect(mark('MyAnimeList')).toHaveTextContent('M')
  })
})
