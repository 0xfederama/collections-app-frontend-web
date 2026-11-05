import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { mockViewport } from '../test-utils'
import { PageHeaderSlot } from './PageHeaderSlot'

function setup(width: number) {
  mockViewport(width)
  render(
    <MemoryRouter>
      <PageHeaderSlot
        back={{
          to: { pathname: '/lists/l1', search: '?q=dune&sort=title' },
          label: 'Back to Watchlist',
        }}
      />
    </MemoryRouter>,
  )
}

describe('F-026 W5 PageHeaderSlot (the item page back control)', () => {
  it('on a phone is a link to the item list, keeping the list search and sort', () => {
    setup(375)
    expect(screen.getByRole('link', { name: 'Back to Watchlist' })).toHaveAttribute(
      'href',
      '/lists/l1?q=dune&sort=title',
    )
  })

  it('renders nothing from 768 px (the text link or the panel takes over)', () => {
    setup(768)
    expect(screen.queryByRole('link', { name: 'Back to Watchlist' })).toBeNull()
  })
})
