import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LinkIcon, ServiceIcon } from './ServiceIcon'

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

  it('shows no badge when free', () => {
    render(<ServiceIcon name="YouTube" />)
    expect(screen.queryByTestId('paid-badge')).toBeNull()
  })

  it('falls back to a text chip for an unknown service', () => {
    const { container } = render(<ServiceIcon name="Hulu" />)
    expect(screen.getByText('Hulu')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('LinkIcon draws a monogram when no file exists', () => {
    const { container } = render(<LinkIcon name="IMDb" />)
    expect(screen.getByRole('img', { name: 'IMDb' })).toHaveTextContent('I')
    expect(container.querySelector('img')).toBeNull()
  })
})
