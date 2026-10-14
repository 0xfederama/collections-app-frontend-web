import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw/http'
import { describe, expect, it } from 'vitest'
import { server } from '../mocks/server'
import { mockViewport, renderAt } from '../test-utils'

const readyz = `${location.origin}/readyz`

describe('AppShell', () => {
  it('renders Collections navigation and main landmarks, without a banner, on desktop', async () => {
    renderAt('/')
    expect(screen.getByRole('navigation', { name: 'Collections' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    await screen.findByText('Backend: ready')
  })

  it('renders the banner top bar and main landmarks on mobile', async () => {
    mockViewport(375)
    renderAt('/')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    await screen.findByText('Backend: ready')
  })

  it('shows "Backend: ready" after the mocked /readyz answers 200', async () => {
    renderAt('/')
    expect(await screen.findByText('Backend: ready')).toBeInTheDocument()
  })

  it('shows "Backend: checking" before the first answer', () => {
    renderAt('/')
    expect(screen.getByText('Backend: checking')).toBeInTheDocument()
  })

  it('shows "Backend: down" after a 503', async () => {
    server.use(http.get(readyz, () => new HttpResponse('database unavailable', { status: 503 })))
    renderAt('/')
    expect(await screen.findByText('Backend: down')).toBeInTheDocument()
  })

  it('shows "Backend: down" when the server is unreachable', async () => {
    server.use(http.get(readyz, () => HttpResponse.error()))
    renderAt('/')
    expect(await screen.findByText('Backend: down')).toBeInTheDocument()
  })
})

describe('Home route', () => {
  it('renders the Home heading at "/"', async () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    await screen.findByText('Backend: ready')
  })
})

describe('Unknown route', () => {
  it('renders "Page not found" with a link home, inside the shell', async () => {
    renderAt('/does/not/exist')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Collections' })).toBeInTheDocument()
    await screen.findByText('Backend: ready')
  })

  it('renders "Page not found" inside the mobile shell (banner and main)', async () => {
    mockViewport(375)
    renderAt('/does/not/exist')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    await screen.findByText('Backend: ready')
  })
})

describe('Dev UI route', () => {
  it('renders the UI gallery at /dev/ui in dev builds', async () => {
    expect(import.meta.env.DEV).toBe(true)
    renderAt('/dev/ui')
    expect(await screen.findByRole('heading', { name: 'UI gallery' })).toBeInTheDocument()
  })
})
