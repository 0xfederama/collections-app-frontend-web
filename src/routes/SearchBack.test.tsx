import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { mockViewport, renderAt } from '../test-utils'

describe('3.4.1 Search on a phone goes back to Home', () => {
  it('shows a Back to Home chevron that opens Home', async () => {
    mockViewport(375)
    renderAt('/search?q=matrix')
    await screen.findByRole('heading', { name: 'Search', level: 1 })
    await userEvent.click(screen.getByRole('button', { name: 'Back to Home' }))
    expect(await screen.findByRole('heading', { name: 'Collections' })).toBeInTheDocument()
  })

  it('has no chevron at tablet width and up', async () => {
    mockViewport(1024)
    renderAt('/search?q=matrix')
    await screen.findByRole('heading', { name: 'Search', level: 1 })
    expect(screen.queryByRole('button', { name: 'Back to Home' })).not.toBeInTheDocument()
  })
})
