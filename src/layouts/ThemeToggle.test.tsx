import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../mocks/server'
import { mockViewport, renderAt } from '../test-utils'

const bar = () => screen.getByRole('banner')
const trigger = (name: string) => within(bar()).getByRole('button', { name })

async function choose(user: ReturnType<typeof userEvent.setup>, current: string, label: string) {
  await user.click(trigger(`Theme: ${current}`))
  await user.click(await screen.findByRole('menuitem', { name: label }))
}

describe('F008-W1 theme selector in the top bar', () => {
  it('defaults to System and says so', async () => {
    mockViewport(1280)
    renderAt('/')
    expect(trigger('Theme: System')).toHaveTextContent('System')
  })

  it.each([
    ['Dark', 'dark'],
    ['Light', 'light'],
  ])('choosing %s sets data-theme and persists it', async (label, theme) => {
    mockViewport(1280)
    const user = userEvent.setup()
    renderAt('/')
    await choose(user, 'System', label)
    expect(document.documentElement.dataset.theme).toBe(theme)
    expect(localStorage.getItem('collection:theme')).toBe(theme)
    expect(trigger(`Theme: ${label}`)).toBeInTheDocument()
  })

  it('choosing System removes the stored key', async () => {
    mockViewport(1280)
    const user = userEvent.setup()
    renderAt('/')
    await choose(user, 'System', 'Dark')
    await choose(user, 'Dark', 'System')
    expect(localStorage.getItem('collection:theme')).toBeNull()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('makes no network request when the theme changes', async () => {
    mockViewport(1280)
    const user = userEvent.setup()
    renderAt('/')
    await screen.findByRole('tree')
    const requests: string[] = []
    const listener = ({ request }: { request: Request }) => requests.push(request.method)
    server.events.on('request:start', listener)
    try {
      await choose(user, 'System', 'Dark')
      await choose(user, 'Dark', 'System')
    } finally {
      server.events.removeListener('request:start', listener)
    }
    expect(requests).toEqual([])
  })

  it.each([375, 800, 1280])(
    'is in the top bar at %ipx, next to search and Quick add',
    async (w) => {
      mockViewport(w)
      renderAt('/')
      expect(within(bar()).getByRole('combobox', { name: 'Search' })).toBeInTheDocument()
      expect(trigger('Quick add')).toBeInTheDocument()
      expect(trigger('Theme: System')).toBeInTheDocument()
    },
  )

  it('Quick add in the top bar opens the dialog', async () => {
    mockViewport(1280)
    const user = userEvent.setup()
    renderAt('/')
    await user.click(trigger('Quick add'))
    expect(await screen.findByRole('dialog', { name: 'Quick add' })).toBeInTheDocument()
  })
})
