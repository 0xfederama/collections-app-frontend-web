import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Card } from './Card'

describe('Card', () => {
  it('renders children and passes through props', () => {
    render(
      <Card data-testid="card" aria-label="Item">
        Hello
      </Card>,
    )
    expect(screen.getByTestId('card')).toHaveTextContent('Hello')
    expect(screen.getByTestId('card')).toHaveAttribute('aria-label', 'Item')
  })

  it('only lifts on hover when interactive', () => {
    render(
      <>
        <Card data-testid="plain">a</Card>
        <Card data-testid="lift" interactive>
          b
        </Card>
      </>,
    )
    expect(screen.getByTestId('plain').className).not.toContain('hover:-translate-y-px')
    expect(screen.getByTestId('lift').className).toContain('hover:-translate-y-px')
  })
})
