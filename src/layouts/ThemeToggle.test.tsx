import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../mocks/server'
import { mockViewport, renderAt } from '../test-utils'

const nav = () => screen.getByRole('navigation', { name: 'Library' })

describe('F007-W6 theme toggle in the sidebar', () => {
  it.each([
    ['Dark', 'dark'],
    ['Light', 'light'],
  ])('choosing %s sets data-theme and persists it', async (label, theme) => {
    mockViewport(1280)
    const user = userEvent.setup()
    renderAt('/')
    await user.click(within(nav()).getByRole('radio', { name: label }))
    expect(document.documentElement.dataset.theme).toBe(theme)
    expect(localStorage.getItem('collection:theme')).toBe(theme)
  })

  it('choosing System removes the stored key', async () => {
    mockViewport(1280)
    const user = userEvent.setup()
    renderAt('/')
    await user.click(within(nav()).getByRole('radio', { name: 'Dark' }))
    await user.click(within(nav()).getByRole('radio', { name: 'System' }))
    expect(localStorage.getItem('collection:theme')).toBeNull()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('makes no network request when the theme changes', async () => {
    mockViewport(1280)
    const user = userEvent.setup()
    renderAt('/')
    const requests: string[] = []
    const listener = ({ request }: { request: Request }) => requests.push(request.method)
    server.events.on('request:start', listener)
    try {
      await user.click(within(nav()).getByRole('radio', { name: 'Dark' }))
      await user.click(within(nav()).getByRole('radio', { name: 'System' }))
    } finally {
      server.events.removeListener('request:start', listener)
    }
    expect(requests).toEqual([])
  })

  it('is available in the mobile drawer', async () => {
    mockViewport(375)
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('the collapsed tablet rail has one button that cycles System, Light, Dark', async () => {
    mockViewport(800)
    localStorage.setItem('collection:sidebar', JSON.stringify({ collapsed: true, width: 280 }))
    const user = userEvent.setup()
    renderAt('/')
    await user.click(within(nav()).getByRole('button', { name: 'Theme: System. Switch to Light' }))
    expect(document.documentElement.dataset.theme).toBe('light')
    await user.click(within(nav()).getByRole('button', { name: 'Theme: Light. Switch to Dark' }))
    expect(localStorage.getItem('collection:theme')).toBe('dark')
  })
})
