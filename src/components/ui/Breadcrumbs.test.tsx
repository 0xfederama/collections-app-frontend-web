import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Breadcrumbs } from './Breadcrumbs'

function setup() {
  render(
    <MemoryRouter>
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          { label: 'Bikes', to: '/c/bikes' },
          { label: 'Ducati' },
        ]}
      />
    </MemoryRouter>,
  )
}

describe('Breadcrumbs', () => {
  it('is a nav named "Breadcrumb" with an ordered list', () => {
    setup()
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(nav).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('links ancestors and marks the last item as the current page', () => {
    setup()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Bikes' })).toHaveAttribute('href', '/c/bikes')
    expect(screen.queryByRole('link', { name: 'Ducati' })).not.toBeInTheDocument()
    expect(screen.getByText('Ducati')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Home')).not.toHaveAttribute('aria-current')
  })

  it('does not link the last item even when it has a "to"', () => {
    render(
      <MemoryRouter>
        <Breadcrumbs items={[{ label: 'Only', to: '/x' }]} />
      </MemoryRouter>,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('Only')).toHaveAttribute('aria-current', 'page')
  })
})
