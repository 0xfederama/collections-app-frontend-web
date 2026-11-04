import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Link, Outlet } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { describe, expect, it } from 'vitest'
import { useTrackPreviousPath } from '../lib/previousPath'
import { mockViewport } from '../test-utils'
import { BackToHomeButton } from './BackToHomeButton'

function Frame() {
  useTrackPreviousPath()
  return <Outlet />
}

function setup(initial: string[], index?: number) {
  mockViewport(375)
  const router = createMemoryRouter(
    [
      {
        element: <Frame />,
        children: [
          { path: '/', element: <Link to="/lists/l1">open list</Link> },
          {
            path: '/lists/l1',
            element: (
              <>
                <BackToHomeButton />
                <Link to="/lists/l1/items/i1">open item</Link>
              </>
            ),
          },
          {
            path: '/lists/l1/items/i1',
            element: <Link to="/lists/l1">back to list</Link>,
          },
        ],
      },
    ],
    { initialEntries: initial, initialIndex: index },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('F-025 BackToHomeButton', () => {
  it('goes back in history when the previous page is Home', async () => {
    const user = userEvent.setup()
    const router = setup(['/'])
    await user.click(screen.getByRole('link', { name: 'open list' }))
    await user.click(screen.getByRole('button', { name: 'Back to Home' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(router.state.historyAction).toBe('POP')
  })

  it('opens Home (push) after list, item, back to the list', async () => {
    const user = userEvent.setup()
    const router = setup(['/'])
    await user.click(screen.getByRole('link', { name: 'open list' }))
    await user.click(screen.getByRole('link', { name: 'open item' }))
    await user.click(screen.getByRole('link', { name: 'back to list' }))
    await user.click(screen.getByRole('button', { name: 'Back to Home' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(router.state.historyAction).toBe('PUSH')
  })

  it('opens Home (push) when the list was opened directly', async () => {
    const user = userEvent.setup()
    const router = setup(['/lists/l1'])
    await user.click(screen.getByRole('button', { name: 'Back to Home' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(router.state.historyAction).toBe('PUSH')
  })
})
