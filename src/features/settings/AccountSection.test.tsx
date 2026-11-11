import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw/http'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OWNER_ME } from '../../mocks/users'
import { problemResponse } from '../../mocks/problems'
import { server } from '../../mocks/server'
import { mockViewport, renderAt } from '../../test-utils'

const meUrl = `${location.origin}/api/v1/me`

async function openAccount() {
  mockViewport(1280)
  renderAt('/settings')
  await userEvent.click(await screen.findByRole('button', { name: 'Account' }))
  const heading = await screen.findByRole('heading', { level: 2, name: 'Account' })
  return within(heading.closest('section')!)
}

describe('F-027 W1 settings: account', () => {
  it('lists Account first among the panes', async () => {
    mockViewport(1280)
    renderAt('/settings')
    const nav = await screen.findByRole('navigation', { name: 'Settings panes' })
    expect(within(nav).getAllByRole('button')[0]).toHaveTextContent('Account')
  })

  it('shows the name and the e-mail, and a Log out link', async () => {
    const section = await openAccount()
    expect(await section.findByText('Owner')).toBeInTheDocument()
    expect(section.getByText('owner@dev.test')).toBeInTheDocument()
    expect(section.getByRole('link', { name: 'Log out' })).toHaveAttribute(
      'href',
      '/cdn-cgi/access/logout',
    )
  })

  it('shows the e-mail as the name when the name is null, once', async () => {
    server.use(http.get(meUrl, () => HttpResponse.json({ ...OWNER_ME, name: null })))
    const section = await openAccount()
    expect(await section.findByText('owner@dev.test')).toBeInTheDocument()
    expect(section.getAllByText('owner@dev.test')).toHaveLength(1)
  })

  it('falls back to the letter tile with no avatar URL, and for a non-https one', async () => {
    const section = await openAccount()
    expect(await section.findByTestId('user-avatar-fallback')).toHaveTextContent('O')
    expect(section.queryByRole('img')).toBeNull()
    expect(document.querySelector('[aria-labelledby="settings-account"] img')).toBeNull()
  })

  it('shows the avatar image for an https URL, with no referrer', async () => {
    server.use(
      http.get(meUrl, () =>
        HttpResponse.json({ ...OWNER_ME, avatar_url: 'https://img.example.com/a.png' }),
      ),
    )
    const section = await openAccount()
    await section.findByText('Owner')
    const img = document.querySelector('[aria-labelledby="settings-account"] img')
    expect(img).toHaveAttribute('src', 'https://img.example.com/a.png')
    expect(img).toHaveAttribute('referrerpolicy', 'no-referrer')
    expect(img).toHaveAttribute('alt', '')
  })

  it('does not load an http avatar', async () => {
    server.use(
      http.get(meUrl, () =>
        HttpResponse.json({ ...OWNER_ME, avatar_url: 'http://img.example.com/a.png' }),
      ),
    )
    const section = await openAccount()
    expect(await section.findByTestId('user-avatar-fallback')).toBeInTheDocument()
  })

  it('has no Log out with dev identities', async () => {
    server.use(
      http.get(meUrl, () =>
        HttpResponse.json({
          ...OWNER_ME,
          identity_source: 'dev',
          dev_identities: ['owner@dev.test'],
        }),
      ),
    )
    const section = await openAccount()
    await section.findByText('Owner')
    expect(section.queryByRole('link', { name: 'Log out' })).not.toBeInTheDocument()
  })

  it('D-150 on the home network shows the owner normally, with no Log out', async () => {
    server.use(http.get(meUrl, () => HttpResponse.json({ ...OWNER_ME, identity_source: 'lan' })))
    const section = await openAccount()
    expect(await section.findByText('Owner')).toBeInTheDocument()
    expect(section.getByText('owner@dev.test')).toBeInTheDocument()
    expect(section.getByTestId('user-avatar-fallback')).toBeInTheDocument()
    expect(section.queryByRole('link', { name: 'Log out' })).not.toBeInTheDocument()
    expect(section.queryByRole('combobox', { name: 'Signed in as (dev)' })).toBeNull()
  })

  it('shows an error with Retry when /me fails', async () => {
    server.use(http.get(meUrl, () => problemResponse(500, 'internal_error')))
    const section = await openAccount()
    expect(await section.findByRole('alert')).toHaveTextContent('Couldn’t load your account.')
    expect(section.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })
})

describe('F-027 W7 dev user switcher', () => {
  const reload = vi.fn()
  const identities = ['owner@dev.test', 'alice@dev.test', 'bob@dev.test']
  const withIdentities = (value: string[] | null) =>
    server.use(
      http.get(meUrl, () =>
        HttpResponse.json({ ...OWNER_ME, identity_source: 'dev', dev_identities: value }),
      ),
    )

  beforeEach(() => {
    reload.mockClear()
    document.cookie = 'dev_user=; Path=/; Max-Age=0'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is not shown when dev_identities is null (production)', async () => {
    const section = await openAccount()
    await section.findByText('Owner')
    expect(section.queryByRole('combobox', { name: 'Signed in as (dev)' })).toBeNull()
  })

  it('is not shown when dev_identities is empty', async () => {
    withIdentities([])
    const section = await openAccount()
    await section.findByText('Owner')
    expect(section.queryByRole('combobox', { name: 'Signed in as (dev)' })).toBeNull()
  })

  it('lists the identities, current value is the signed-in e-mail, with the note', async () => {
    withIdentities(identities)
    const section = await openAccount()
    const select = await section.findByRole('combobox', { name: 'Signed in as (dev)' })
    expect(select).toHaveTextContent('owner@dev.test')
    expect(select).toHaveAccessibleDescription('Test users: this server runs with fake identities.')
    await userEvent.click(select)
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(identities)
  })

  it('choosing another identity writes the dev_user cookie and reloads', async () => {
    withIdentities(identities)
    const section = await openAccount()
    vi.stubGlobal('location', { ...window.location, origin: window.location.origin, reload })
    await userEvent.click(await section.findByRole('combobox', { name: 'Signed in as (dev)' }))
    await userEvent.click(await screen.findByRole('option', { name: 'bob@dev.test' }))
    expect(document.cookie).toContain('dev_user=bob%40dev.test')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not write the cookie or reload when the current identity is chosen again', async () => {
    withIdentities(identities)
    const section = await openAccount()
    vi.stubGlobal('location', { ...window.location, origin: window.location.origin, reload })
    await userEvent.click(await section.findByRole('combobox', { name: 'Signed in as (dev)' }))
    await userEvent.click(await screen.findByRole('option', { name: 'owner@dev.test' }))
    expect(document.cookie).not.toContain('dev_user=')
    expect(reload).not.toHaveBeenCalled()
  })
})
