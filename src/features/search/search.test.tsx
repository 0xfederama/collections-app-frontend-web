import { QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '../../components/ui'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { RouterProvider } from 'react-router/dom'
import { createTestRouter } from '../../app/router'
import { createTestQueryClient, mockViewport } from '../../test-utils'

function renderRouter(path = '/') {
  const router = createTestRouter([path])
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return router
}

const field = () => screen.getByRole('combobox', { name: 'Search' })

describe('W-04 "/" focuses the search field', () => {
  it('focuses the field when "/" is pressed outside a text field', async () => {
    const user = userEvent.setup()
    renderRouter()
    expect(field()).not.toHaveFocus()
    await user.keyboard('/')
    expect(field()).toHaveFocus()
    // The shortcut key itself is not typed into the field.
    expect(field()).toHaveValue('')
  })

  it('works when a non-text element such as a link has focus', async () => {
    const user = userEvent.setup()
    renderRouter()
    await user.click(screen.getByRole('link', { name: 'Trash' }))
    screen.getByRole('link', { name: 'Settings' }).focus()
    await user.keyboard('/')
    expect(field()).toHaveFocus()
  })

  it('types a normal "/" when the search field itself has focus', async () => {
    const user = userEvent.setup()
    renderRouter()
    await user.click(field())
    await user.keyboard('a/b')
    expect(field()).toHaveValue('a/b')
    expect(field()).toHaveFocus()
  })

  it('does nothing when another input or textarea has focus', () => {
    renderRouter()
    for (const tag of ['input', 'textarea'] as const) {
      const other = document.body.appendChild(document.createElement(tag))
      other.focus()
      const notPrevented = fireEvent.keyDown(other, { key: '/' })
      expect(notPrevented).toBe(true)
      expect(field()).not.toHaveFocus()
      expect(other).toHaveFocus()
      other.remove()
    }
  })

  it.each([['ctrlKey'], ['metaKey'], ['altKey']])('does nothing with %s held', (modifier) => {
    renderRouter()
    const notPrevented = fireEvent.keyDown(document.body, { key: '/', [modifier]: true })
    expect(notPrevented).toBe(true)
    expect(field()).not.toHaveFocus()
  })

  it('ignores other keys', async () => {
    const user = userEvent.setup()
    renderRouter()
    await user.keyboard('s?')
    expect(field()).not.toHaveFocus()
  })

  it('expands the tablet rail and focuses the field', async () => {
    mockViewport(800)
    localStorage.setItem('collection:sidebar', JSON.stringify({ collapsed: true, width: 280 }))
    const user = userEvent.setup()
    renderRouter()
    expect(screen.queryByRole('combobox', { name: 'Search' })).not.toBeInTheDocument()

    await user.keyboard('/')
    await waitFor(() => expect(field()).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('collection:sidebar')!).collapsed).toBe(false)
  })

  it('the rail Search button expands the sidebar and focuses the field', async () => {
    mockViewport(800)
    localStorage.setItem('collection:sidebar', JSON.stringify({ collapsed: true, width: 280 }))
    const user = userEvent.setup()
    renderRouter()
    await user.click(
      within(screen.getByRole('navigation', { name: 'Library' })).getByRole('button', {
        name: 'Search',
      }),
    )
    await waitFor(() => expect(field()).toHaveFocus())
  })
})

describe('W-04 sidebar search submit', () => {
  it('navigates to /search?q=<query> on Enter and shows the search page', async () => {
    const user = userEvent.setup()
    const router = renderRouter()
    await user.type(field(), 'red bike{Enter}')
    expect(router.state.location.pathname).toBe('/search')
    expect(router.state.location.search).toBe('?q=red%20bike')
    expect(await screen.findByRole('heading', { name: 'Search' })).toBeInTheDocument()
    expect(await screen.findByText(/red bike/)).toBeInTheDocument()
  })

  it('URL-encodes reserved characters', async () => {
    const user = userEvent.setup()
    const router = renderRouter()
    await user.type(field(), 'a&b=c#d?')
    await user.keyboard('{Enter}')
    expect(router.state.location.search).toBe('?q=a%26b%3Dc%23d%3F')
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('a&b=c#d?')
    expect(screen.getByText(/a&b=c#d\?/)).toBeInTheDocument()
  })

  it('trims surrounding whitespace', async () => {
    const user = userEvent.setup()
    const router = renderRouter()
    await user.type(field(), '  cats  {Enter}')
    expect(router.state.location.search).toBe('?q=cats')
  })

  it.each([['{Enter}'], ['   {Enter}']])(
    'ignores an empty or whitespace query (%j)',
    async (typed) => {
      const user = userEvent.setup()
      const router = renderRouter()
      await user.click(field())
      await user.keyboard(typed)
      expect(router.state.location.pathname).toBe('/')
      expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    },
  )

  it('does not navigate until Enter is pressed', async () => {
    const user = userEvent.setup()
    const router = renderRouter()
    await user.type(field(), 'cats')
    expect(router.state.location.pathname).toBe('/')
  })
})
