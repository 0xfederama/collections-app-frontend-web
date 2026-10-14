import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Chip } from './Chip'
import { Info } from './icons'

describe('Chip', () => {
  it('shows its text', () => {
    render(<Chip>Wishlist</Chip>)
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
  })

  it.each(['neutral', 'accent', 'success', 'warning', 'danger'] as const)(
    'shows text for tone %s (never colour alone)',
    (tone) => {
      render(<Chip tone={tone}>State {tone}</Chip>)
      expect(screen.getByText(`State ${tone}`)).toBeVisible()
    },
  )

  it('hides a decorative icon from assistive tech', () => {
    const { container } = render(<Chip icon={<Info />}>Info</Chip>)
    expect(container.querySelector('[aria-hidden="true"] svg')).toBeInTheDocument()
    expect(screen.getByText('Info')).toBeInTheDocument()
  })
})
