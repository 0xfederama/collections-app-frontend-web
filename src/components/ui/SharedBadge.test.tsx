import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Folder } from './icons'
import { SharedBadge } from './SharedBadge'

describe('F-027 shared badge', () => {
  it('draws the two-person mark over the icon when shared', () => {
    render(
      <SharedBadge shared>
        <Folder data-testid="icon" />
      </SharedBadge>,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByTestId('shared-badge')).toBeInTheDocument()
  })

  it('renders only the icon when not shared', () => {
    render(
      <SharedBadge shared={false}>
        <Folder data-testid="icon" />
      </SharedBadge>,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.queryByTestId('shared-badge')).not.toBeInTheDocument()
  })

  it('hides the mark from assistive tech (the row name carries the hint)', () => {
    render(
      <SharedBadge shared>
        <Folder />
      </SharedBadge>,
    )
    expect(screen.getByTestId('shared-badge')).toHaveAttribute('aria-hidden', 'true')
  })
})
