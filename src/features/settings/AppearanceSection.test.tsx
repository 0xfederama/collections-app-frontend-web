import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../mocks/server'
import { mockViewport, renderAt } from '../../test-utils'

const group = () => screen.getByRole('radiogroup', { name: 'Theme' })

async function openSettings() {
  mockViewport(1280)
  const user = userEvent.setup()
  renderAt('/settings')
  await screen.findByRole('dialog', { name: 'Settings' })
  await screen.findByRole('heading', { name: 'Appearance' })
  return user
}

describe('F008 rework: theme in Settings > General', () => {
  it('has an Appearance section with a labelled theme group, "System default" selected', async () => {
    await openSettings()
    expect(within(group()).getByRole('radio', { name: 'System default' })).toBeChecked()
    expect(within(group()).getByRole('radio', { name: 'Light' })).not.toBeChecked()
    expect(within(group()).getByRole('radio', { name: 'Dark' })).not.toBeChecked()
  })

  it.each([
    ['Dark', 'dark'],
    ['Light', 'light'],
  ])('choosing %s sets data-theme and persists it', async (label, theme) => {
    const user = await openSettings()
    await user.click(within(group()).getByRole('radio', { name: label }))
    expect(document.documentElement.dataset.theme).toBe(theme)
    expect(localStorage.getItem('collection:theme')).toBe(theme)
    expect(within(group()).getByRole('radio', { name: label })).toBeChecked()
  })

  it('choosing System default removes the stored key', async () => {
    const user = await openSettings()
    await user.click(within(group()).getByRole('radio', { name: 'Dark' }))
    await user.click(within(group()).getByRole('radio', { name: 'System default' }))
    expect(localStorage.getItem('collection:theme')).toBeNull()
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('makes no network request when the theme changes', async () => {
    // The pane loads its own data (settings, store providers) after it renders: wait until it is idle,
    // so only requests caused by the theme clicks are counted.
    let inFlight = 0
    let providersLoaded = false
    const started = () => inFlight++
    const ended = ({ request }: { request: Request }) => {
      inFlight--
      if (request.url.endsWith('/store-providers')) providersLoaded = true
    }
    server.events.on('request:start', started)
    server.events.on('request:end', ended)
    const requests: string[] = []
    const listener = ({ request }: { request: Request }) =>
      requests.push(`${request.method} ${request.url}`)
    try {
      const user = await openSettings()
      await vi.waitFor(() => expect(providersLoaded && inFlight === 0).toBe(true))
      server.events.on('request:start', listener)
      await user.click(within(group()).getByRole('radio', { name: 'Dark' }))
      await user.click(within(group()).getByRole('radio', { name: 'System default' }))
    } finally {
      server.events.removeListener('request:start', listener)
      server.events.removeListener('request:start', started)
      server.events.removeListener('request:end', ended)
    }
    expect(requests).toEqual([])
  })

  it('the shell has no theme control any more', async () => {
    mockViewport(1280)
    renderAt('/')
    await screen.findByRole('tree')
    expect(screen.queryByRole('button', { name: /^Theme/ })).not.toBeInTheDocument()
  })
})
