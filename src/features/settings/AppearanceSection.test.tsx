import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../../mocks/server'
import { mockViewport, renderAt } from '../../test-utils'

const group = () => screen.getByRole('radiogroup', { name: 'Theme' })

async function openSettings() {
  mockViewport(1280)
  const user = userEvent.setup()
  renderAt('/settings')
  await user.click(await screen.findByRole('button', { name: 'Appearance' }))
  await screen.findByRole('heading', { name: 'Appearance' })
  return user
}

describe('F008 rework: theme in Settings > Appearance', () => {
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
    const user = await openSettings()
    const requests: string[] = []
    const listener = ({ request }: { request: Request }) => requests.push(request.method)
    server.events.on('request:start', listener)
    try {
      await user.click(within(group()).getByRole('radio', { name: 'Dark' }))
      await user.click(within(group()).getByRole('radio', { name: 'System default' }))
    } finally {
      server.events.removeListener('request:start', listener)
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
