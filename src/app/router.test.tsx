import { render, screen } from '@testing-library/react'
import { RouterProvider } from 'react-router/dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestRouter } from './router'

function renderAt(path: string) {
  return render(<RouterProvider router={createTestRouter([path])} />)
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('AppShell', () => {
  it('renders banner, Collections navigation and main landmarks', async () => {
    renderAt('/')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Collections' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    await screen.findByText('Backend: ready')
  })

  it('requests /readyz and shows "Backend: ready" after a 200', async () => {
    renderAt('/')
    expect(await screen.findByText('Backend: ready')).toBeInTheDocument()
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/readyz')
  })

  it('shows "Backend: down" after a non-OK response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 503 } as Response)
    renderAt('/')
    expect(await screen.findByText('Backend: down')).toBeInTheDocument()
  })

  it('shows "Backend: down" after a rejected fetch', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('network error'))
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
