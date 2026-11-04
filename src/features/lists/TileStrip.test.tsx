import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TileStrip } from './TileStrip'

const tiles = ['a', 'b', 'c', 'd', 'e'].map((id) => <i key={id} data-testid="tile" />)

function setWidth(width: number) {
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: width })
}

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth')
})

describe('F-025 TileStrip', () => {
  it('draws every tile when nothing is measured', () => {
    render(<TileStrip tiles={tiles} size={20} noun="services" />)
    expect(screen.getAllByTestId('tile')).toHaveLength(5)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('draws the tiles that fit and a "+N" tile for the rest', () => {
    // 4 px badge room + 3 tiles (20) and 2 gaps (6) = 76: 3 fit, one slot is the +N tile.
    setWidth(76)
    render(<TileStrip tiles={tiles} size={20} noun="services" />)
    expect(screen.getAllByTestId('tile')).toHaveLength(2)
    expect(screen.getByRole('img', { name: '3 more services' })).toHaveTextContent('+3')
  })

  it('names stores in the "+N" tile', () => {
    setWidth(76)
    render(<TileStrip tiles={tiles} size={20} noun="stores" />)
    expect(screen.getByRole('img', { name: '3 more stores' })).toBeInTheDocument()
  })

  it('shows no "+N" when everything fits', () => {
    setWidth(400)
    render(<TileStrip tiles={tiles} size={20} noun="services" />)
    expect(screen.getAllByTestId('tile')).toHaveLength(5)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
